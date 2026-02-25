import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Droplet, Activity, AlertTriangle, MapPin, Radio,
    Settings, ShieldAlert, Cpu, Gauge, BarChart3,
    Clock, History, Download, TrendingUp, DollarSign, LogOut
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Login from './Login';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Dashboard = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
    const [telemetry, setTelemetry] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [currentMode, setCurrentMode] = useState('normal');
    const [stats, setStats] = useState({
        pressure: 5.0,
        flow: 100.0,
        severity: 'Minor',
        score: 0
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [analytics, setAnalytics] = useState(null);
    const [trends, setTrends] = useState([]);
    const [geoJson, setGeoJson] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [riskData, setRiskData] = useState(null);
    const [viewMode, setViewMode] = useState('live'); // live or risk

    const ws = useRef(null);

    useEffect(() => {
        // Poll single data points for graphs
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/v1/simulation/data');
                if (!res.ok) throw new Error("Simulation data fetch failed");
                const data = await res.json();

                let timestamp = new Date();
                if (data.timestamp) {
                    const parsed = new Date(data.timestamp);
                    if (!isNaN(parsed)) timestamp = parsed;
                }

                setTelemetry(prev => [...prev.slice(-29), {
                    ...data,
                    time: timestamp.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
                }]);
                setStats({
                    pressure: data.pressure || 0,
                    flow: data.flow_rate || 0,
                    mode: data.mode || 'normal'
                });
            } catch (e) {
                console.error("Failed to fetch simulation data", e);
            }
        }, 1000);

        // Initial Analytics fetch
        const fetchAnalytics = async () => {
            try {
                const endpoints = [
                    '/api/v1/analytics/summary',
                    '/api/v1/analytics/trends',
                    '/api/v1/localization/geo-json',
                    '/api/v1/maintenance/',
                    '/api/v1/analytics/risk-assessment'
                ];

                const responses = await Promise.all(endpoints.map(e => fetch(e).catch(err => ({ ok: false, json: () => null }))));

                const [sum, trend, geo, tick, risk] = await Promise.all(responses.map(r => r.ok ? r.json().catch(() => null) : null));

                if (sum) setAnalytics(sum);
                if (trend) setTrends(Array.isArray(trend) ? trend : []);
                if (geo) setGeoJson(geo);
                if (tick) setTickets(Array.isArray(tick) ? tick : []);
                if (risk) setRiskData(risk);
            } catch (e) {
                console.error("Failed to fetch analytical data", e);
            }
        };

        // Setup WebSocket for real-time alerts
        const connectWS = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const socket = new WebSocket(`${protocol}//${window.location.host}/ws/alerts`);

            socket.onmessage = (event) => {
                try {
                    const alert = JSON.parse(event.data);
                    if (alert) {
                        setAlerts(prev => [alert, ...prev.slice(0, 9)]);
                        fetchAnalytics();
                    }
                } catch (e) {
                    console.error("WebSocket message error", e);
                }
            };

            socket.onclose = () => {
                setTimeout(connectWS, 3000);
            };

            ws.current = socket;
        };

        fetchAnalytics();
        connectWS();
        fetchAnalytics();

        return () => {
            clearInterval(interval);
            if (ws.current) ws.current.close();
        };
    }, [isLoggedIn]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
    };

    if (!isLoggedIn) {
        return <Login onLogin={() => setIsLoggedIn(true)} />;
    }

    const changeMode = async (mode) => {
        await fetch(`/api/v1/simulation/mode/${mode}`, { method: 'POST' });
        setCurrentMode(mode);
    };

    return (
        <div className="min-h-screen bg-[#020617] p-6 space-y-6 text-slate-200">
            {/* Header */}
            <header className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                        <Droplet size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">LeakWatch AI</h1>
                        <p className="text-sm text-slate-400 font-medium">Infrastructure Intelligence Dashboard</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400'}`}
                    >
                        Live Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'reports' ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400'}`}
                    >
                        Intelligence Reports
                    </button>
                    <div className="w-[1px] h-8 bg-white/5 mx-2" />
                    {['normal', 'small_leak', 'major_burst', 'intermittent', 'valve_fault'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => changeMode(mode)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currentMode === mode
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                                }`}
                        >
                            {mode.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 border border-white/5 transition-all"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-black">
                        AD
                    </div>
                </div>
            </header>

            {activeTab === 'dashboard' ? (
                <>
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'System Pressure', val: `${stats.pressure} bar`, icon: Gauge, color: 'text-blue-400' },
                            { label: 'Flow Rate', val: `${stats.flow} L/min`, icon: Activity, color: 'text-emerald-400' },
                            { label: 'Anomaly Status', val: alerts[0]?.severity || 'Healthy', icon: ShieldAlert, color: alerts[0]?.severity === 'Critical' ? 'text-red-500' : 'text-slate-400' },
                            { label: 'Network Confidence', val: '98.4%', icon: Cpu, color: 'text-purple-400' },
                        ].map((item, idx) => (
                            <div key={idx} className="glass p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-colors">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                                    <h3 className={`text-2xl font-bold ${item.color}`}>{item.val}</h3>
                                </div>
                                <div className={`p-3 rounded-xl bg-slate-950/50 ${item.color}`}>
                                    <item.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pressure Chart */}
                        <div className="lg:col-span-2 glass rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Activity size={18} className="text-brand-400" />
                                    Live Telemetry Analysis
                                </h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Pressure
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Flow
                                    </div>
                                </div>
                            </div>

                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={telemetry}>
                                        <defs>
                                            <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPressure)" />
                                        <Area type="monotone" dataKey="flow_rate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFlow)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Alerts & Localization */}
                        <div className="space-y-6">
                            <div className="glass rounded-2xl p-6 min-h-[440px] flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Radio size={18} className="text-red-500 animate-pulse" />
                                        Incident Log
                                    </h3>
                                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider underline">Live Feed</span>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {alerts.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 opacity-50">
                                            <ShieldAlert size={40} strokeWidth={1} />
                                            <p className="text-sm font-medium">No active leaks detected</p>
                                        </div>
                                    ) : (
                                        alerts.map((alert, idx) => {
                                            const ticket = tickets.find(t => t.alert_id === alert.id);
                                            return (
                                                <div key={idx} className={`p-4 rounded-xl border space-y-3 transition-all ${alert.severity === 'Critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                                    <div className="flex gap-4">
                                                        <div className={`p-2 rounded-lg self-start ${alert.severity === 'Critical' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            <AlertTriangle size={20} />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-white">{alert.severity || 'Unknown'} Incident</span>
                                                                    <span className="text-[10px] text-slate-500 font-mono italic">
                                                                        {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A'}
                                                                    </span>
                                                                </div>
                                                                {ticket ? (
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ticket.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        ticket.status === 'In Progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                                                                        }`}>
                                                                        {ticket.status}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-medium leading-relaxed">{alert.analysis}</p>
                                                            <div className="flex items-center gap-4 pt-1">
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase">
                                                                    <MapPin size={10} /> Seg: {JSON.stringify(alert.location)}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-brand-400">Score: {Math.round(alert.severity_score)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!ticket ? (
                                                        <button
                                                            onClick={async () => {
                                                                const res = await fetch('/api/v1/maintenance/', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ alert_id: alert.id, notes: 'Automated ticket from dashboard' })
                                                                });
                                                                if (res.ok) {
                                                                    const freshTickets = await (await fetch('/api/v1/maintenance/')).json();
                                                                    setTickets(freshTickets);
                                                                }
                                                            }}
                                                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-white"
                                                        >
                                                            Create Maintenance Ticket
                                                        </button>
                                                    ) : ticket.status !== 'Resolved' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={async () => {
                                                                    await fetch(`/api/v1/maintenance/${ticket.id}`, {
                                                                        method: 'PATCH',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ status: 'In Progress' })
                                                                    });
                                                                    const freshTickets = await (await fetch('/api/v1/maintenance/')).json();
                                                                    setTickets(freshTickets);
                                                                }}
                                                                className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[10px] font-bold text-blue-400 transition-all"
                                                            >
                                                                Dispatch
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    await fetch(`/api/v1/maintenance/${ticket.id}`, {
                                                                        method: 'PATCH',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ status: 'Resolved' })
                                                                    });
                                                                    const freshTickets = await (await fetch('/api/v1/maintenance/')).json();
                                                                    setTickets(freshTickets);
                                                                }}
                                                                className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400 transition-all"
                                                            >
                                                                Resolve
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Network Diagram Placeholder */}
                        <div className="glass rounded-2xl p-6 md:col-span-2 min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <MapPin size={18} className="text-brand-400" />
                                    {viewMode === 'live' ? 'Geospatial Infrastructure Map' : 'Infrastructure Risk Heatmap'}
                                </h3>
                                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setViewMode('live')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'live' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Live
                                    </button>
                                    <button
                                        onClick={() => setViewMode('risk')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'risk' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Risk
                                    </button>
                                </div>
                            </div>
                            <div className="h-[320px] rounded-xl overflow-hidden border border-white/5 relative bg-slate-900 shadow-inner">
                                {geoJson && geoJson.features && (
                                    <MapContainer center={[18.5204, 73.8567]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
                                        <TileLayer
                                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                        />
                                        {geoJson.features.map((f, i) => {
                                            const key = `feat-${i}`;
                                            if (f.geometry.type === 'Point') {
                                                const id = f.properties?.id;
                                                const loc = alerts[0]?.location;
                                                const isLeakingNode = typeof loc === 'string' && loc.split('-').includes(id);
                                                return (
                                                    <Marker
                                                        key={key}
                                                        position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                                                    >
                                                        <Popup>
                                                            <div className="text-slate-900 p-1">
                                                                <strong>Node: {id}</strong><br />
                                                                Status: {isLeakingNode ? 'ALERT' : 'Normal'}
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            }

                                            if (f.geometry.type === 'LineString') {
                                                const segment = f.properties?.segment;
                                                const isLeakingSegment = alerts[0]?.location === segment;
                                                const risk = riskData?.[segment];
                                                const riskColor = risk?.status === 'Critical' ? '#ef4444' : risk?.status === 'Warning' ? '#f97316' : '#10b981';

                                                return (
                                                    <Polyline
                                                        key={key}
                                                        positions={f.geometry.coordinates.map(c => [c[1], c[0]])}
                                                        pathOptions={{
                                                            color: viewMode === 'live' ? (isLeakingSegment ? '#ef4444' : '#3b82f6') : riskColor,
                                                            weight: (viewMode === 'live' && isLeakingSegment) ? 10 : 6,
                                                            opacity: 0.8,
                                                            dashArray: (viewMode === 'live' && isLeakingSegment) ? '10, 15' : null
                                                        }}
                                                    >
                                                        <Popup>
                                                            <div className="text-slate-900 p-1">
                                                                <strong>Segment: {segment}</strong><br />
                                                                Status: {isLeakingSegment ? 'LEAK DETECTED' : 'Normal'}
                                                            </div>
                                                        </Popup>
                                                    </Polyline>
                                                );
                                            }
                                            return null;
                                        })}
                                    </MapContainer>
                                )}
                            </div>
                        </div>

                        {/* Training Status */}
                        <div className="glass rounded-2xl p-6 bg-brand-500/5">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <Settings size={18} className="text-brand-400" />
                                System Calibration
                            </h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">The Isolation Forest model is optimized for the current network load. Calibrate to refresh baselines.</p>
                            <button
                                onClick={() => fetch('/api/v1/detection/train-simulated', { method: 'POST' })}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
                            >
                                Calibrate AI Model
                            </button>
                            <div className="mt-6 p-4 rounded-xl bg-slate-950/50 space-y-3">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    <span>Model Status</span>
                                    <span className="text-emerald-500">Optimal</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 w-[95%]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Incidents (30d)', val: analytics?.summary?.total_incidents || 0, icon: History, color: 'text-blue-400' },
                            { label: 'Critical Events', val: analytics?.summary?.critical_incidents || 0, icon: ShieldAlert, color: 'text-red-400' },
                            { label: 'Est. Water Loss', val: `${analytics?.summary?.total_water_loss_liters || 0} L`, icon: Droplet, color: 'text-cyan-400' },
                            { label: 'Financial Impact', val: `$${analytics?.summary?.total_financial_loss_usd || 0}`, icon: DollarSign, color: 'text-emerald-400' },
                        ].map((item, idx) => (
                            <div key={idx} className="glass p-5 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                                    <h3 className={`text-2xl font-bold ${item.color}`}>{item.val}</h3>
                                </div>
                                <div className={`p-3 rounded-xl bg-slate-950/50 ${item.color}`}>
                                    <item.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 glass rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                                <TrendingUp size={18} className="text-brand-400" />
                                Incident Trends (Last 7 Days)
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trends}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="timestamp" stroke="#64748b" fontSize={10} />
                                        <YAxis stroke="#64748b" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        />
                                        <Line type="monotone" dataKey="incidents" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Download size={18} className="text-brand-400" />
                                Export Reports
                            </h3>
                            <div className="space-y-4">
                                <button className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group">
                                    <div className="text-left">
                                        <p className="text-sm font-bold">Monthly Summary</p>
                                        <p className="text-[10px] text-slate-500">Analytics, Loss, & Maintenance</p>
                                    </div>
                                    <Download size={18} className="text-slate-500 group-hover:text-white" />
                                </button>
                                <button className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group">
                                    <div className="text-left">
                                        <p className="text-sm font-bold">Raw Telemetry Data</p>
                                        <p className="text-[10px] text-slate-500">CSV/JSON Export</p>
                                    </div>
                                    <Download size={18} className="text-slate-500 group-hover:text-white" />
                                </button>
                            </div>

                            <div className="mt-8 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                                <p className="text-xs font-bold text-brand-400 mb-2 uppercase tracking-wider">AI Insight</p>
                                <p className="text-xs text-slate-400 leading-relaxed italic">
                                    "System efficiency has increased by 12% compared to last month. Major Burst events are being detected 45 seconds faster on average."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

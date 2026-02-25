import React, { useState } from 'react';
import { ShieldAlert, User, Lock, Droplet } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                onLogin();
            } else {
                setError(data.detail || 'Authentication failed');
            }
        } catch (err) {
            setError('Server connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="glass w-full max-w-md p-8 rounded-3xl relative z-10 border border-white/5 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-brand-500/10 rounded-2xl mb-4 text-brand-400">
                        <Droplet size={40} className="animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">LeakWatch AI</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Infrastructure Security Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all"
                                placeholder="Admin ID"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-500 hover:bg-brand-400 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Authenticating...' : 'Secure Authorization'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 opacity-50">
                    <ShieldAlert size={14} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">End-to-End Encrypted Monitoring</span>
                </div>
            </div>
        </div>
    );
};

export default Login;

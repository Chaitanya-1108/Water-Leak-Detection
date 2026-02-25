import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.simulation.router import router as simulation_router
from app.detection.router import router as detection_router
from app.localization.router import router as localization_router
from app.alerts.router import router as alerts_router
from app.analytics.router import router as analytics_router
from app.maintenance.router import router as maintenance_router
from app.auth.router import router as auth_router

# Import services for background processing
from app.simulation.service import simulator_engine
from app.detection.service import detection_service
from app.localization.service import network_model
from app.alerts.manager import manager
from app.notifications.service import notification_manager
from app.database.session import SessionLocal, engine, Base
from app.models.db_models import LeakAlert, SensorReading

def save_reading_to_db(reading):
    db = SessionLocal()
    try:
        db_reading = SensorReading(
            timestamp=reading.timestamp,
            pressure=reading.pressure,
            flow_rate=reading.flow_rate,
            acoustic_signal=reading.acoustic_signal,
            mode=reading.mode
        )
        db.add(db_reading)
        db.commit()
    except Exception as e:
        print(f"Error saving reading to DB: {e}")
    finally:
        db.close()

def save_alert_to_db(result, loc_result):
    db = SessionLocal()
    try:
        db_alert = LeakAlert(
            timestamp=result.timestamp,
            is_leak=result.is_leak,
            confidence=result.confidence,
            severity_score=result.severity_score,
            severity=result.severity,
            location=loc_result.suspected_segment[0] + "-" + loc_result.suspected_segment[1] if loc_result.suspected_segment else "Unknown",
            analysis=loc_result.analysis,
            avg_pressure=result.features.avg_pressure,
            avg_flow=result.features.avg_flow,
            acoustic_peak=result.features.acoustic_peak
        )
        db.add(db_alert)
        db.commit()
    except Exception as e:
        print(f"Error saving alert to DB: {e}")
    finally:
        db.close()

async def sensor_data_collector():
    """Background task to collect data, run detection, and broadcast alerts."""
    while True:
        # 1. Generate new reading
        reading = simulator_engine.generate_next_reading()
        
        # Save reading to DB (optional: might want to do this in batches if high frequency)
        save_reading_to_db(reading)
        
        # 2. Add to detection buffer
        detection_service.add_reading(reading)
        
        # 3. Periodically run detection (every 5 seconds to avoid noise)
        if len(detection_service.buffer) >= 60:
            result = detection_service.run_detection()
            
            if result and result.is_leak:
                # 4. Attempt localization if leak detected
                node_pressures = {
                    "Tank": result.features.avg_pressure + 0.5,
                    "A": result.features.avg_pressure,
                    "B": result.features.avg_pressure - 0.4,
                    "C": result.features.avg_pressure - 0.4,
                    "D": result.features.avg_pressure - 0.7
                }
                loc_result = network_model.localize_leak(node_pressures)
                
                # Save alert to DB
                save_alert_to_db(result, loc_result)
                
                # 5. Broadcast alert via WebSocket
                location_str = f"{loc_result.suspected_segment[0]}-{loc_result.suspected_segment[1]}" if loc_result.suspected_segment else "Unknown"
                alert_payload = {
                    "event": "LEAK_DETECTED",
                    "severity": result.severity,
                    "severity_score": result.severity_score,
                    "confidence": result.confidence,
                    "location": location_str,
                    "analysis": loc_result.analysis,
                    "timestamp": result.timestamp.isoformat()
                }
                await manager.broadcast(alert_payload)
                
                # 6. Trigger External Notification (Email/SMS)
                notification_manager.send_leak_alert(
                    severity=result.severity,
                    location=str(loc_result.suspected_segment) if loc_result.suspected_segment else "Multiple Segments",
                    analysis=loc_result.analysis
                )
                
        await asyncio.sleep(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Start background collector
    task = asyncio.create_task(sensor_data_collector())
    yield
    # Cleanup
    task.cancel()

app = FastAPI(
    title="Water Leak Detection API",
    description="AI-powered water leak detection and localization system.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(content="", media_type="image/x-icon")

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Check the health of the system.
    """
    return {"status": "healthy", "version": "1.0.0"}

# Include routers
app.include_router(simulation_router, prefix="/api/v1/simulation", tags=["Simulation"])
app.include_router(detection_router, prefix="/api/v1/detection", tags=["Detection"])
app.include_router(localization_router, prefix="/api/v1/localization", tags=["Localization"])
app.include_router(alerts_router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(maintenance_router, prefix="/api/v1/maintenance", tags=["Maintenance"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json
from .models import SimulationMode, SensorData, SimulationState
from .service import simulator_engine
from app.database.session import get_db
from app.models.db_models import SensorReading

router = APIRouter()

@router.get("/history")
async def get_sensor_history(limit: int = 100, db: Session = Depends(get_db)):
    """
    Fetch historical sensor readings from the database.
    """
    readings = db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(limit).all()
    return readings

@router.get("/status", response_model=SimulationState)
async def get_status():
    """
    Get current simulation status and last reading.
    """
    return SimulationState(
        is_active=True,
        current_mode=simulator_engine.mode,
        last_reading=None # Could store last reading if needed
    )

@router.post("/mode/{mode}")
async def set_simulation_mode(mode: SimulationMode):
    """
    Set the simulation mode (normal, small_leak, major_burst).
    """
    simulator_engine.set_mode(mode)
    return {"message": f"Simulation mode set to {mode}"}

@router.get("/data")
async def get_current_data():
    """
    Get a single snapshot of the current simulated sensor data.
    """
    return simulator_engine.generate_next_reading()

@router.get("/stream")
async def stream_sensor_data():
    """
    Stream sensor data in real-time (every 1 second) using Server-Sent Events (SSE).
    """
    async def event_generator():
        while True:
            data = simulator_engine.generate_next_reading()
            yield f"data: {json.dumps(data.model_dump(), default=str)}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

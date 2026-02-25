from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import List

class SimulationMode(str, Enum):
    NORMAL = "normal"
    SMALL_LEAK = "small_leak"
    MAJOR_BURST = "major_burst"
    INTERMITTENT = "intermittent"
    VALVE_FAULT = "valve_fault"

class SensorData(BaseModel):
    timestamp: datetime
    pressure: float  # bar
    flow_rate: float # L/min
    acoustic_signal: float # mV or relative amplitude
    mode: SimulationMode

class SimulationState(BaseModel):
    is_active: bool
    current_mode: SimulationMode
    last_reading: SensorData | None = None

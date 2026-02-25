from pydantic import BaseModel
from datetime import datetime
from typing import List

class FeatureVector(BaseModel):
    window_start: datetime
    window_end: datetime
    avg_pressure: float
    pressure_drop_rate: float
    avg_flow: float
    flow_std_dev: float
    acoustic_peak: float
    sample_count: int

class DetectionResult(BaseModel):
    is_leak: bool
    confidence: float
    severity_score: float
    severity: str # "Minor", "Moderate", "Critical"
    features: FeatureVector
    timestamp: datetime

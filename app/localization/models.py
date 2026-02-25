from pydantic import BaseModel
from typing import List, Tuple

class LocalizationRequest(BaseModel):
    # node_id -> pressure_reading
    node_pressures: dict[str, float]

class LocalizationResult(BaseModel):
    suspected_segment: Tuple[str, str] | None
    confidence: float
    analysis: str

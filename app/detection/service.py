from datetime import datetime, timedelta
from typing import List, Deque
from collections import deque
from app.simulation.models import SensorData
from app.detection.features import extractor
from app.detection.anomaly_detector import detector
from app.detection.scoring import SeverityScorer
from .models import FeatureVector, DetectionResult

class DetectionService:
    def __init__(self, window_size_seconds: int = 60):
        self.window_size = window_size_seconds
        self.buffer: Deque[SensorData] = deque(maxlen=window_size_seconds)
        self.is_monitoring = True
        
    def add_reading(self, reading: SensorData):
        self.buffer.append(reading)
        
    def get_features(self) -> FeatureVector | None:
        if len(self.buffer) < 5: 
            return None
        return extractor.extract_from_window(list(self.buffer))

    def run_detection(self) -> DetectionResult | None:
        features = self.get_features()
        if not features:
            return None
            
        is_anomaly, confidence = detector.predict(features)
        
        # Calculate calculated severity score and standard classification
        severity_score, severity_label = SeverityScorer.calculate(features)
            
        return DetectionResult(
            is_leak=is_anomaly,
            confidence=confidence,
            severity_score=severity_score,
            severity=severity_label,
            features=features,
            timestamp=datetime.now()
        )

# Global detection service instance
detection_service = DetectionService()

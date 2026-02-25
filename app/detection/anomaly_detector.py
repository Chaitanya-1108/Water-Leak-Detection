import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple
from .models import FeatureVector, DetectionResult
from datetime import datetime

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.is_trained = False
        
    def train(self, historical_data: List[FeatureVector]):
        """
        Train the Isolation Forest model on normal historical data.
        """
        if not historical_data:
            return
        
        df = self._prepare_data(historical_data)
        self.model.fit(df)
        self.is_trained = True
        
    def predict(self, features: FeatureVector) -> Tuple[bool, float]:
        """
        Predict if the given feature vector is an anomaly.
        Returns: (is_anomaly, anomaly_score)
        """
        if not self.is_trained:
            # If not trained, we can't make reliable predictions
            # In a real app, we'd load a pre-trained model
            return False, 0.0
            
        df = self._prepare_data([features])
        prediction = self.model.predict(df) # -1 for anomaly, 1 for normal
        score = self.model.decision_function(df) # Lower is more anomalous
        
        is_anomaly = True if prediction[0] == -1 else False
        # Normalize score for easier consumption (0 to 1, where 1 is highly anomalous)
        # Decision function returns values where negative is anomalous.
        normalized_score = float(abs(min(0, score[0])) * 5) # Heuristic normalization
        
        return is_anomaly, min(1.0, normalized_score)

    def _prepare_data(self, data: List[FeatureVector]) -> pd.DataFrame:
        """Convert list of FeatureVector to pandas DataFrame for sklearn."""
        records = []
        for f in data:
            records.append({
                "avg_pressure": f.avg_pressure,
                "pressure_drop_rate": f.pressure_drop_rate,
                "avg_flow": f.avg_flow,
                "flow_std_dev": f.flow_std_dev,
                "acoustic_peak": f.acoustic_peak
            })
        return pd.DataFrame(records)

# Global detector instance
detector = AnomalyDetector()

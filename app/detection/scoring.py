from .models import FeatureVector

class SeverityScorer:
    # Baselines based on simulation specs
    BASE_PRESSURE = 5.0
    BASE_FLOW = 100.0
    MAX_ACOUSTIC = 60.0 # Heuristic max based on major burst simulation

    @staticmethod
    def calculate(features: FeatureVector) -> tuple[float, str]:
        """
        Calculate severity score (0-100) and classification.
        Formula: (Pressure Drop % * 0.5) + (Flow Deviation % * 0.3) + (Acoustic Intensity * 0.2)
        """
        # 1. Pressure Drop %
        pressure_drop_pct = max(0, (SeverityScorer.BASE_PRESSURE - features.avg_pressure) / SeverityScorer.BASE_PRESSURE) * 100
        
        # 2. Flow Deviation %
        # We use flow_std_dev relative to BASE_FLOW as a measure of deviation %
        flow_dev_pct = min(100, (features.flow_std_dev / SeverityScorer.BASE_FLOW) * 100)
        
        # 3. Acoustic Intensity (scaled 0-100)
        # We scale the peak acoustic signal relative to a known "max" burst level
        acoustic_intensity = min(100, (features.acoustic_peak / SeverityScorer.MAX_ACOUSTIC) * 100)
        
        # Weighted sum
        score = (pressure_drop_pct * 0.5) + (flow_dev_pct * 0.3) + (acoustic_intensity * 0.2)
        score = round(min(100, score), 2)
        
        # Classification
        if score < 30:
            classification = "Minor"
        elif score < 60:
            classification = "Moderate"
        else:
            classification = "Critical"
            
        return score, classification

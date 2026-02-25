import statistics
from typing import List
from .models import FeatureVector
from app.simulation.models import SensorData

class FeatureExtractor:
    @staticmethod
    def extract_from_window(data: List[SensorData]) -> FeatureVector:
        if not data:
            raise ValueError("Data window is empty")
        
        pressures = [d.pressure for d in data]
        flows = [d.flow_rate for d in data]
        acoustics = [d.acoustic_signal for d in data]
        
        avg_pressure = statistics.mean(pressures)
        avg_flow = statistics.mean(flows)
        
        # Pressure drop rate (slope: (end - start) / time)
        # Using simple (last - first) over the window duration
        if len(pressures) > 1:
            pressure_drop_rate = (pressures[0] - pressures[-1]) / len(pressures)
            flow_std_dev = statistics.stdev(flows)
        else:
            pressure_drop_rate = 0.0
            flow_std_dev = 0.0
            
        acoustic_peak = max(acoustics)
        
        return FeatureVector(
            window_start=data[0].timestamp,
            window_end=data[-1].timestamp,
            avg_pressure=round(avg_pressure, 3),
            pressure_drop_rate=round(pressure_drop_rate, 4),
            avg_flow=round(avg_flow, 2),
            flow_std_dev=round(flow_std_dev, 3),
            acoustic_peak=round(acoustic_peak, 2),
            sample_count=len(data)
        )

# Global extractor instance
extractor = FeatureExtractor()

import random
import math
from datetime import datetime
from .models import SensorData, SimulationMode

class WaterSensorSimulator:
    def __init__(self):
        self.mode = SimulationMode.NORMAL
        self.pressure_base = 5.0
        self.flow_base = 100.0
        self.acoustic_base = 10.0
        self.tick_count = 0
        
    def set_mode(self, mode: SimulationMode):
        self.mode = mode
        # Reset tick count when mode changes to start effects from beginning
        self.tick_count = 0

    def generate_next_reading(self) -> SensorData:
        self.tick_count += 1
        
        pressure = self.pressure_base
        flow_rate = self.flow_base
        acoustic = self.acoustic_base
        
        # Add basic noise
        noise_p = random.uniform(-0.05, 0.05)
        noise_f = random.uniform(-1.0, 1.0)
        noise_a = random.uniform(-0.5, 0.5)

        if self.mode == SimulationMode.NORMAL:
            # Stable values
            pressure += noise_p
            flow_rate += noise_f
            acoustic += noise_a
            
        elif self.mode == SimulationMode.SMALL_LEAK:
            # Gradual pressure drop (0.01 bar per second)
            # Slight increase in flow rate at source
            pressure_drop = min(2.0, self.tick_count * 0.01)
            pressure = self.pressure_base - pressure_drop + noise_p
            flow_rate = self.flow_base + (self.tick_count * 0.2) + noise_f
            acoustic = self.acoustic_base + 5.0 + random.uniform(0, 2.0)
            
        elif self.mode == SimulationMode.MAJOR_BURST:
            # Sudden pressure drop
            # Huge flow rate spike then drop or zero
            if self.tick_count < 3:
                # Initial burst phase
                pressure = self.pressure_base - 3.0 + noise_p
                flow_rate = self.flow_base * 2.5 + noise_f
                acoustic = self.acoustic_base + 50.0 + random.uniform(0, 10.0)
            else:
                # Sustained burst phase
                pressure = 1.5 + noise_p
                flow_rate = self.flow_base * 0.2 + noise_f # significantly reduced pressure downstream
                acoustic = self.acoustic_base + 30.0 + random.uniform(0, 5.0)

        elif self.mode == SimulationMode.INTERMITTENT:
            # Oscillation: leak opens and closes every 5 ticks
            if (self.tick_count // 5) % 2 == 0:
                pressure += noise_p
                flow_rate += noise_f
                acoustic += noise_a
            else:
                pressure = self.pressure_base - 1.5 + noise_p
                flow_rate = self.flow_base + 15.0 + noise_f
                acoustic = self.acoustic_base + 12.0 + random.uniform(0, 3.0)

        elif self.mode == SimulationMode.VALVE_FAULT:
            # Random pressure surges and drops
            pressure = self.pressure_base + (math.sin(self.tick_count * 0.5) * 2.5) + noise_p
            flow_rate = self.flow_base + (math.cos(self.tick_count * 0.5) * 20.0) + noise_f
            acoustic = self.acoustic_base + 8.0 + noise_a

        return SensorData(
            timestamp=datetime.now(),
            pressure=round(max(0.0, pressure), 3),
            flow_rate=round(max(0.0, flow_rate), 2),
            acoustic_signal=round(max(0.0, acoustic), 2),
            mode=self.mode
        )

# Singleton simulator instance for the application
simulator_engine = WaterSensorSimulator()

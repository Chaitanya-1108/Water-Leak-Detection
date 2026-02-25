import networkx as nx
from typing import Dict, Tuple, List
from .models import LocalizationResult

class WaterNetworkModel:
    def __init__(self):
        self.graph = nx.Graph()
        self._initialize_network()
        # Normal pressure drop thresholds per segment (heuristic)
        self.drop_thresholds = {
            ("Tank", "A"): 0.5,
            ("A", "B"): 0.3,
            ("A", "C"): 0.3,
            ("C", "D"): 0.2
        }
        # Geospatial coordinates for Leaflet mapping
        # Based on a representative industrial/urban patch
        self.node_coords = {
            "Tank": [18.5204, 73.8567], # Pune Central (Reference)
            "A": [18.5225, 73.8585],
            "B": [18.5240, 73.8560],
            "C": [18.5210, 73.8610],
            "D": [18.5195, 73.8635]
        }

    def _initialize_network(self):
        """
        Model the distribution network:
        Tank -> A
        A -> B
        A -> C
        C -> D
        """
        self.graph.add_edge("Tank", "A", length=100)
        self.graph.add_edge("A", "B", length=50)
        self.graph.add_edge("A", "C", length=80)
        self.graph.add_edge("C", "D", length=40)

    def localize_leak(self, pressures: Dict[str, float]) -> LocalizationResult:
        """
        Analyzes pressure gradients to find anomalies.
        If the drop between two connected nodes exceeds the threshold,
        a leak is likely on that segment.
        """
        max_deviation = 0.0
        suspected_edge = None
        
        for u, v in self.graph.edges():
            if u in pressures and v in pressures:
                # Calculate actual drop
                # Assuming flow direction Tank -> A -> ...
                # So P[u] should be > P[v]
                actual_drop = pressures[u] - pressures[v]
                
                # Get threshold (handle bidirectional keys)
                threshold = self.drop_thresholds.get((u, v)) or self.drop_thresholds.get((v, u), 0.5)
                
                deviation = actual_drop - threshold
                if deviation > max_deviation:
                    max_deviation = deviation
                    suspected_edge = (u, v)

        if suspected_edge:
            # Heuristic confidence based on deviation magnitude
            confidence = min(0.95, 0.5 + (max_deviation / 2.0))
            return LocalizationResult(
                suspected_segment=suspected_edge,
                confidence=round(confidence, 2),
                analysis=f"Significant pressure drop of {round(max_deviation + threshold, 2)} bar detected between {suspected_edge[0]} and {suspected_edge[1]}."
            )
            
        return LocalizationResult(
            suspected_segment=None,
            confidence=0.0,
            analysis="Pressure gradients appear normal across all modeled segments."
        )

    def get_geo_json(self) -> dict:
        """
        Returns the network as a geo-aware structure for the frontend.
        """
        features = []
        
        # Nodes as Points
        for node, coords in self.node_coords.items():
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [coords[1], coords[0]]},
                "properties": {"id": node, "type": "sensor"}
            })
            
        # Edges as LineStrings
        for u, v in self.graph.edges():
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString", 
                    "coordinates": [
                        [self.node_coords[u][1], self.node_coords[u][0]],
                        [self.node_coords[v][1], self.node_coords[v][0]]
                    ]
                },
                "properties": {"segment": f"{u}-{v}"}
            })
            
        return {"type": "FeatureCollection", "features": features}

# Global network instance
network_model = WaterNetworkModel()

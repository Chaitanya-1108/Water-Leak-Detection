from fastapi import APIRouter, HTTPException
from .models import LocalizationRequest, LocalizationResult
from .service import network_model

router = APIRouter()

@router.post("/analyze", response_model=LocalizationResult)
async def analyze_network(request: LocalizationRequest):
    """
    Perform leak localization based on pressure readings from different nodes in the network.
    Expected nodes: Tank, A, B, C, D.
    """
    try:
        return network_model.localize_leak(request.node_pressures)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph")
async def get_network_graph():
    """
    Returns the network topology (nodes and edges).
    """
    return {
        "nodes": list(network_model.graph.nodes()),
        "edges": list(network_model.graph.edges())
    }

@router.get("/geo-json")
async def get_network_geo_json():
    """
    Returns the network topology in GeoJSON format.
    """
    return network_model.get_geo_json()

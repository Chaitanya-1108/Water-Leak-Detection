from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
from .models import FeatureVector, DetectionResult
from .service import detection_service
from .features import extractor
from app.simulation.models import SensorData

router = APIRouter()

@router.post("/extract", response_model=FeatureVector)
async def extract_features(data: List[SensorData]):
    """
    Manually extract features from a provided window of sensor data.
    """
    try:
        if not data:
            raise HTTPException(status_code=400, detail="Data window cannot be empty")
        return extractor.extract_from_window(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/detect", response_model=DetectionResult)
async def detect_anomalies():
    """
    Run anomaly detection on the current buffered data.
    """
    result = detection_service.run_detection()
    if not result:
        raise HTTPException(status_code=400, detail="Insufficient data for detection.")
    return result

@router.post("/train")
async def train_model(data: List[FeatureVector]):
    """
    Train the Isolation Forest model with a provided set of normal historical features.
    """
    from app.detection.anomaly_detector import detector
    detector.train(data)
    return {"message": "Model trained successfully", "sample_count": len(data)}

@router.post("/train-simulated")
async def train_with_simulation(background_tasks: BackgroundTasks):
    """
    Generate simulated normal data to train the model.
    """
    from app.simulation.service import simulator_engine
    from app.simulation.models import SimulationMode
    from app.detection.features import extractor
    from app.detection.anomaly_detector import detector
    
    def background_train():
        # Store original mode
        original_mode = simulator_engine.mode
        simulator_engine.set_mode(SimulationMode.NORMAL)
        
        training_data = []
        for _ in range(10): # Generate 10 windows
            window = []
            for _ in range(60): # 60 samples per window
                window.append(simulator_engine.generate_next_reading())
            training_data.append(extractor.extract_from_window(window))
            
        detector.train(training_data)
        simulator_engine.set_mode(original_mode)
        
    background_tasks.add_task(background_train)
    return {"message": "Simulated training started in background"}

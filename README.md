# Water Leak Detection AI Backend

This is a clean, modular FastAPI backend for an AI-powered water leak detection system.

## Project Structure
- `app/`: Main application code
    - `simulation/`: Water flow and pressure simulation logic
    - `detection/`: Leak detection algorithms and AI models
    - `localization/`: Leak localization logic
    - `alerts/`: Notification and alerting system
    - `models/`: Database models and Pydantic schemas
    - `database/`: Database configuration and session management
- `requirements.txt`: Project dependencies
- `.env`: Environment variables

## Getting Started

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Access the API:
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)
   - Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

## Simulation Module API
- `GET /api/v1/simulation/data`: Get a single JSON snapshot of sensor data.
- `GET /api/v1/simulation/stream`: Stream real-time sensor data (SSE, 1 event/sec).
- `POST /api/v1/simulation/mode/{mode}`: Change simulation condition (`normal`, `small_leak`, `major_burst`).
- `GET /api/v1/simulation/status`: Get current simulator state.

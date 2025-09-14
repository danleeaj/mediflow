from typing import Union
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import os

# import dotenv
# dotenv.load_dotenv()

from agent.agent import process_patient_data

app = FastAPI()

# Pydantic model for the request body
class PatientRequest(BaseModel):
    patient_id: str

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/patient")
def get_patient_report(request: PatientRequest):
    """Trigger a patient report for the specified patient ID."""
    try:
        if not request.patient_id or not request.patient_id.strip():
            raise HTTPException(status_code=400, detail="Patient ID cannot be empty")

        # Capture the output from the agent
        import io
        from contextlib import redirect_stdout
        
        captured_output = io.StringIO()
        
        with redirect_stdout(captured_output):
            process_patient_data(request.patient_id.strip())

        output = captured_output.getvalue()
        
        return {
            "success": True,
            "patient_id": request.patient_id,
            "message": "Patient report generated successfully",
            "output": output
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating patient report: {str(e)}")

@app.get("/patient/{patient_id}")
def get_patient_report_get(patient_id: str):
    """Alternative GET endpoint to trigger a patient report."""
    try:
        if not patient_id or not patient_id.strip():
            raise HTTPException(status_code=400, detail="Patient ID cannot be empty")
        
        # Capture the output from the agent
        import io
        from contextlib import redirect_stdout
        
        captured_output = io.StringIO()
        
        with redirect_stdout(captured_output):
            process_patient_data(patient_id.strip())
        
        output = captured_output.getvalue()
        
        return {
            "success": True,
            "patient_id": patient_id,
            "message": "Patient report generated successfully",
            "output": output
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating patient report: {str(e)}")
    
@app.post("/patient/{patient_id}")
def trigger_patient_report_post(patient_id: str):
    """POST endpoint to trigger a patient report."""
    try:
        if not patient_id or not patient_id.strip():
            raise HTTPException(status_code=400, detail="Patient ID cannot be empty")
        
        process_patient_data(patient_id.strip())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating patient report: {str(e)}")
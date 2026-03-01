# =============================================================================
# MGCARE Backend - Audio Analysis Endpoints
# =============================================================================

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Any

router = APIRouter()


class AnalysisResponse(BaseModel):
    """Response schema for audio analysis."""
    success: bool
    prediction: Optional[Any] = None
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    features: Optional[dict] = None
    key_indicators: Optional[dict] = None
    probabilities: Optional[dict] = None
    recommendation: Optional[str] = None
    error: Optional[str] = None


@router.post("/audio", response_model=AnalysisResponse)
async def analyze_audio(
    file: UploadFile = File(..., description="Audio file (WAV format recommended)")
) -> AnalysisResponse:
    """
    Analyze an audio file for voice biomarkers and get AI recommendations.
    
    Accepts audio files (preferably WAV format with sustained vowel /a/ recording).
    Extracts acoustic features, runs MG (Myasthenia Gravis) detection model,
    and generates personalized recommendations using Groq LLM.
    
    Returns:
        - prediction: Model prediction (0 = healthy, 1 = pathological)
        - confidence: Prediction confidence score
        - risk_level: Risk assessment (low/moderate/high)
        - features: All extracted acoustic features
        - key_indicators: Most important diagnostic features
        - recommendation: AI-generated personalized recommendation
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    allowed_extensions = {".wav", ".mp3", ".ogg", ".flac", ".m4a"}
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        audio_bytes = await file.read()
        
        if len(audio_bytes) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 50MB."
            )

        from app.services.audio_analysis import audio_analysis_service
        from app.services.recommendation import recommendation_service
        
        # Run audio analysis
        result = audio_analysis_service.analyze_audio(audio_bytes, file.filename)
        
        # Generate AI recommendation based on analysis
        recommendation = recommendation_service.generate_recommendation(result)
        
        return AnalysisResponse(
            success=True,
            prediction=result.get("prediction"),
            confidence=result.get("confidence"),
            risk_level=result.get("risk_level"),
            features=result.get("features"),
            key_indicators=result.get("key_indicators"),
            probabilities=result.get("probabilities"),
            recommendation=recommendation,
        )

    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )


@router.get("/status")
async def analysis_status() -> dict:
    """Check if the analysis service is ready."""
    from app.services.audio_analysis import audio_analysis_service
    
    return {
        "service": "audio_analysis",
        "model_loaded": audio_analysis_service.model is not None,
        "ready": True,
    }

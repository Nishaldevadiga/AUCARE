# =============================================================================
# MGCARE Backend - Groq LLM Recommendation Service
# =============================================================================
"""
Uses Groq LLM to analyze voice analysis results and provide personalized
recommendations for Myasthenia Gravis patients based on fatigue indicators.
"""

import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from groq import Groq

# Load .env file from backend directory
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

logger = logging.getLogger(__name__)

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


class RecommendationService:
    """Service for generating MG fatigue recommendations using Groq LLM."""
    
    def __init__(self):
        self.client = None
        self._init_client()
    
    def _init_client(self):
        """Initialize Groq client."""
        if GROQ_API_KEY:
            try:
                self.client = Groq(api_key=GROQ_API_KEY)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self.client = None
        else:
            logger.warning("GROQ_API_KEY not set, recommendations will be unavailable")
    
    def generate_recommendation(self, analysis_result: dict) -> Optional[str]:
        """
        Generate a personalized recommendation based on voice analysis results.
        
        Args:
            analysis_result: Dictionary containing prediction, confidence, 
                           risk_level, key_indicators, and features
        
        Returns:
            Recommendation string or None if generation fails
        """
        if not self.client:
            return None
        
        try:
            # Extract key information
            prediction = analysis_result.get("prediction")
            confidence = analysis_result.get("confidence")
            risk_level = analysis_result.get("risk_level", "unknown")
            key_indicators = analysis_result.get("key_indicators", {})
            probabilities = analysis_result.get("probabilities", {})
            
            # Format indicators for the prompt
            indicators_text = self._format_indicators(key_indicators)
            
            # Determine the classification
            if prediction == 1:
                classification = "pathological (signs of vocal fatigue detected)"
            else:
                classification = "healthy (no significant fatigue signs)"
            
            prompt = f"""You are a medical AI assistant specialized in Myasthenia Gravis (MG) patient care. 
A patient has just completed a voice fatigue assessment by recording a sustained vowel /a/ sound.

ANALYSIS RESULTS:
- Classification: {classification}
- Confidence: {confidence:.1%} if confidence else 'N/A'
- Risk Level: {risk_level.upper()}
- Probability of healthy voice: {probabilities.get('healthy', 'N/A'):.1%} if probabilities.get('healthy') else 'N/A'
- Probability of fatigue indicators: {probabilities.get('pathological', 'N/A'):.1%} if probabilities.get('pathological') else 'N/A'

KEY VOICE INDICATORS:
{indicators_text}

INDICATOR EXPLANATIONS:
- F0 (Fundamental Frequency): Lower values or declining trends may indicate muscle fatigue
- F0 Slope: Negative slope suggests "sinking pitch sign" - voice pitch dropping during sustained vocalization (common in MG fatigue)
- HNR (Harmonics-to-Noise Ratio): Lower values indicate breathiness/voice quality degradation
- Jitter: Higher values indicate pitch instability
- Shimmer: Higher values indicate amplitude instability

Based on this voice fatigue analysis for a Myasthenia Gravis patient, provide:

1. A brief interpretation of what these results suggest about the patient's current fatigue state (2-3 sentences)
2. 3-4 specific, actionable recommendations for the patient
3. When they should consider contacting their healthcare provider

Keep your response concise, empathetic, and focused on practical guidance. Do not diagnose - only provide supportive recommendations based on the fatigue indicators.
Format your response in a clear, patient-friendly way."""

            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a supportive healthcare AI assistant helping Myasthenia Gravis patients understand their voice fatigue assessments. Be empathetic, clear, and practical."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=800,
            )
            
            recommendation = response.choices[0].message.content
            return recommendation
            
        except Exception as e:
            logger.error(f"Failed to generate recommendation: {e}")
            return None
    
    def _format_indicators(self, indicators: dict) -> str:
        """Format key indicators for the prompt."""
        lines = []
        
        indicator_names = {
            "f0_mean": "F0 Mean (Hz)",
            "f0_slope": "F0 Slope (global)",
            "temporal_f0_slope": "F0 Slope (temporal/within recording)",
            "hnr_mean": "HNR Mean (dB)",
            "jitter_local": "Jitter (local)",
            "shimmer_local": "Shimmer (local)",
        }
        
        for key, label in indicator_names.items():
            value = indicators.get(key)
            if value is not None and not (isinstance(value, float) and (value != value)):  # Check for NaN
                if isinstance(value, float):
                    lines.append(f"- {label}: {value:.4f}")
                else:
                    lines.append(f"- {label}: {value}")
            else:
                lines.append(f"- {label}: Not available")
        
        return "\n".join(lines)


# Create singleton instance
recommendation_service = RecommendationService()

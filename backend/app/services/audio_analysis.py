# =============================================================================
# AUCARE Backend - Audio Feature Extraction & Analysis Service
# =============================================================================
"""
Extracts acoustic features from audio recordings for MG (Myasthenia Gravis) detection.
Features include F0 stats, jitter, shimmer, HNR, MFCCs, CPPS, spectral features,
and temporal fatigue trajectory features.

Uses LSTM model for sequence-based prediction.
"""

import warnings
warnings.filterwarnings("ignore")

import logging
import numpy as np
import parselmouth
from parselmouth.praat import call
import librosa
import torch
import torch.nn as nn
from pathlib import Path
from typing import Optional, List
import tempfile
import os

logger = logging.getLogger(__name__)

# ─── CONFIG ──────────────────────────────────────────────────────────────────
N_MFCC = 20
N_FRAMES = 10
N_TEMPORAL_FEATURES = 19  # features per frame produced by extract_temporal_features
SR = 8000              # Target sample rate (must match training)
DURATION = 5.0         # Target duration in seconds (must match training)
F0_MIN = 75.0
F0_MAX = 500.0

# Path to the trained LSTM model — configurable via LSTM_MODEL_PATH env var
def _resolve_model_path() -> Path:
    from app.core.config import settings
    if settings.LSTM_MODEL_PATH:
        return Path(settings.LSTM_MODEL_PATH)
    return Path(__file__).resolve().parent.parent.parent.parent / "lstm_model.pt"

MODEL_PATH = _resolve_model_path()


# =============================================================================
# Audio Loading (must match training preprocessing exactly)
# =============================================================================

def load_audio_file(audio_path: str, sr: int = SR, duration: float = DURATION) -> np.ndarray:
    """
    Load audio file with resampling and duration clipping to match training.
    
    CRITICAL: Training used sr=8000 and duration=5.0s. This function ensures
    inference uses the exact same preprocessing to avoid feature mismatch.
    
    Args:
        audio_path: Path to audio file
        sr: Target sample rate (default: 8000 Hz)
        duration: Target duration in seconds (default: 5.0s)
    
    Returns:
        Audio signal as numpy array, resampled to sr and clipped/padded to duration
    """
    # Load and resample to target SR
    signal, _ = librosa.load(audio_path, sr=sr, mono=True)
    
    # Calculate target length in samples
    target_length = int(sr * duration)
    
    # Clip or pad to exact duration
    if len(signal) > target_length:
        # Clip to duration (take from start)
        signal = signal[:target_length]
    elif len(signal) < target_length:
        # Pad with zeros if shorter
        padding = target_length - len(signal)
        signal = np.pad(signal, (0, padding), mode='constant', constant_values=0)
    
    return signal


# =============================================================================
# LSTM Model Definition (must be defined before AudioAnalysisService)
# =============================================================================

class LSTMClassifier(nn.Module):
    """Bidirectional LSTM with attention for voice analysis."""
    
    def __init__(self, input_size: int, hidden_size: int = 64, 
                 num_layers: int = 2, num_classes: int = 2, 
                 classifier_hidden: int = 32, dropout: float = 0.3):
        super(LSTMClassifier, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=True
        )
        
        # Layer normalization
        self.layer_norm = nn.LayerNorm(hidden_size * 2)
        
        # Attention mechanism
        self.attention = nn.Linear(hidden_size * 2, 1)
        
        # Classifier (MLP) - indices: 0=Dropout, 1=Linear, 2=ReLU, 3=Dropout, 4=Linear
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, classifier_hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(classifier_hidden, num_classes)
        )
        
        self.softmax = nn.Softmax(dim=1)
    
    def forward(self, x):
        # x shape: (batch, seq_len, input_size)
        lstm_out, _ = self.lstm(x)  # (batch, seq_len, hidden_size * 2)
        
        # Layer normalization
        lstm_out = self.layer_norm(lstm_out)
        
        # Attention
        attention_weights = torch.softmax(self.attention(lstm_out), dim=1)  # (batch, seq_len, 1)
        context = torch.sum(attention_weights * lstm_out, dim=1)  # (batch, hidden_size * 2)
        
        # Classifier
        output = self.classifier(context)
        
        return output
    
    def predict_proba(self, x):
        """Get probability predictions."""
        with torch.no_grad():
            logits = self.forward(x)
            proba = self.softmax(logits)
        return proba


# =============================================================================
# Audio Analysis Service
# =============================================================================

class AudioAnalysisService:
    """Service for audio feature extraction and MG prediction using LSTM."""
    
    def __init__(self):
        self.model = None
        self.model_config = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._load_model()
    
    def _load_model(self):
        """Load the trained LSTM model."""
        if MODEL_PATH.exists():
            try:
                checkpoint = torch.load(MODEL_PATH, map_location=self.device, weights_only=False)
                
                # Extract model configuration if available
                if isinstance(checkpoint, dict):
                    self.model_config = checkpoint.get('config', checkpoint.get('model_config', {}))
                    state_dict = checkpoint.get('model_state_dict', checkpoint.get('state_dict', checkpoint))
                    
                    # If checkpoint doesn't have nested state_dict, it IS the state_dict
                    if 'lstm.weight_ih_l0' not in state_dict and 'lstm.weight_ih_l0' in checkpoint:
                        state_dict = checkpoint
                    
                    # Infer model architecture from state dict
                    if 'lstm.weight_ih_l0' in state_dict:
                        input_size = state_dict['lstm.weight_ih_l0'].shape[1]
                        hidden_size = state_dict['lstm.weight_ih_l0'].shape[0] // 4  # LSTM has 4 gates
                        
                        # Check for bidirectional
                        is_bidirectional = 'lstm.weight_ih_l0_reverse' in state_dict
                        
                        # Check for number of layers
                        num_layers = 1
                        for key in state_dict.keys():
                            if 'lstm.weight_ih_l' in key and '_reverse' not in key:
                                layer_num = int(key.split('lstm.weight_ih_l')[1].split('_')[0])
                                num_layers = max(num_layers, layer_num + 1)
                        
                        # Check output size and classifier hidden size from classifier
                        if 'classifier.4.weight' in state_dict:
                            output_size = state_dict['classifier.4.weight'].shape[0]
                            classifier_hidden = state_dict['classifier.4.weight'].shape[1]
                        elif 'fc.weight' in state_dict:
                            output_size = state_dict['fc.weight'].shape[0]
                            classifier_hidden = hidden_size
                        else:
                            output_size = 2  # Default binary classification
                            classifier_hidden = 32
                        
                        if input_size != N_TEMPORAL_FEATURES:
                            raise ValueError(
                                f"Model input_size ({input_size}) does not match the "
                                f"extractor's feature count ({N_TEMPORAL_FEATURES}). "
                                "Model and feature extractor are mismatched."
                            )

                        logger.info(
                            f"Inferred architecture: input={input_size}, hidden={hidden_size}, "
                            f"layers={num_layers}, bidirectional={is_bidirectional}, "
                            f"classifier_hidden={classifier_hidden}, classes={output_size}"
                        )

                        # Create model with inferred architecture
                        self.model = LSTMClassifier(
                            input_size=input_size,
                            hidden_size=hidden_size,
                            num_layers=num_layers,
                            num_classes=output_size,
                            classifier_hidden=classifier_hidden
                        )
                        self.model.load_state_dict(state_dict)
                    else:
                        # Try loading as full model
                        self.model = checkpoint
                else:
                    # Checkpoint is the model itself (not a dict)
                    self.model = checkpoint
                
                if self.model is not None:
                    self.model.to(self.device)
                    self.model.eval()
                    logger.info(f"LSTM model loaded successfully from {MODEL_PATH}")

            except Exception as e:
                logger.error(f"Could not load LSTM model: {e}", exc_info=True)
                self.model = None
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}")

    def extract_f0_features(self, snd) -> dict:
        """Extract F0 (pitch) global statistics."""
        pitch = snd.to_pitch(
            time_step=0.01,
            pitch_floor=F0_MIN,
            pitch_ceiling=F0_MAX
        )
        f0_values = pitch.selected_array["frequency"]
        f0_voiced = f0_values[f0_values > 0]

        if len(f0_voiced) < 5:
            return {k: np.nan for k in [
                "f0_mean", "f0_std", "f0_min", "f0_max", "f0_range",
                "f0_slope", "f0_cv", "voiced_fraction"
            ]}

        times = np.linspace(0, 1, len(f0_voiced))
        slope = np.polyfit(times, f0_voiced, 1)[0]

        return {
            "f0_mean": float(np.mean(f0_voiced)),
            "f0_std": float(np.std(f0_voiced)),
            "f0_min": float(np.min(f0_voiced)),
            "f0_max": float(np.max(f0_voiced)),
            "f0_range": float(np.max(f0_voiced) - np.min(f0_voiced)),
            "f0_slope": float(slope),
            "f0_cv": float(np.std(f0_voiced) / (np.mean(f0_voiced) + 1e-9)),
            "voiced_fraction": float(len(f0_voiced) / (len(f0_values) + 1e-9)),
        }

    def extract_jitter_shimmer(self, snd) -> dict:
        """Extract perturbation measures (jitter, shimmer) via Praat."""
        point_process = call(snd, "To PointProcess (periodic, cc)", F0_MIN, F0_MAX)

        try:
            jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
            jitter_rap = call(point_process, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
            jitter_ppq5 = call(point_process, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3)
            shimmer_local = call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
            shimmer_apq3 = call([snd, point_process], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
            shimmer_apq5 = call([snd, point_process], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
            shimmer_dda = call([snd, point_process], "Get shimmer (dda)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        except Exception:
            return {k: np.nan for k in [
                "jitter_local", "jitter_rap", "jitter_ppq5",
                "shimmer_local", "shimmer_apq3", "shimmer_apq5", "shimmer_dda"
            ]}

        return {
            "jitter_local": jitter_local,
            "jitter_rap": jitter_rap,
            "jitter_ppq5": jitter_ppq5,
            "shimmer_local": shimmer_local,
            "shimmer_apq3": shimmer_apq3,
            "shimmer_apq5": shimmer_apq5,
            "shimmer_dda": shimmer_dda,
        }

    def extract_hnr(self, snd) -> dict:
        """Harmonics-to-Noise Ratio."""
        try:
            harmonicity = call(snd, "To Harmonicity (cc)", 0.01, F0_MIN, 0.1, 1.0)
            hnr_mean = call(harmonicity, "Get mean", 0, 0)
            hnr_std = call(harmonicity, "Get standard deviation", 0, 0)
            return {"hnr_mean": hnr_mean, "hnr_std": hnr_std}
        except Exception:
            return {"hnr_mean": np.nan, "hnr_std": np.nan}

    def extract_mfcc_features(self, signal: np.ndarray, sr: int) -> dict:
        """Extract MFCC global statistics."""
        mfccs = librosa.feature.mfcc(y=signal, sr=sr, n_mfcc=N_MFCC)
        
        feats = {}
        for i in range(N_MFCC):
            feats[f"mfcc{i+1}_mean"] = float(np.mean(mfccs[i]))
            feats[f"mfcc{i+1}_std"] = float(np.std(mfccs[i]))

        delta = librosa.feature.delta(mfccs)
        delta2 = librosa.feature.delta(mfccs, order=2)
        for i in range(N_MFCC):
            feats[f"mfcc{i+1}_delta_mean"] = float(np.mean(delta[i]))
            feats[f"mfcc{i+1}_delta2_mean"] = float(np.mean(delta2[i]))

        return feats

    def extract_spectral_features(self, signal: np.ndarray, sr: int) -> dict:
        """Spectral features: centroid, bandwidth, flux, rolloff, ZCR."""
        centroid = librosa.feature.spectral_centroid(y=signal, sr=sr)[0]
        bandwidth = librosa.feature.spectral_bandwidth(y=signal, sr=sr)[0]
        rolloff = librosa.feature.spectral_rolloff(y=signal, sr=sr)[0]
        zcr = librosa.feature.zero_crossing_rate(signal)[0]
        rms = librosa.feature.rms(y=signal)[0]

        stft = np.abs(librosa.stft(signal))
        flux = np.sqrt(np.mean(np.diff(stft, axis=1) ** 2, axis=0))

        return {
            "spec_centroid_mean": float(np.mean(centroid)),
            "spec_centroid_std": float(np.std(centroid)),
            "spec_bandwidth_mean": float(np.mean(bandwidth)),
            "spec_rolloff_mean": float(np.mean(rolloff)),
            "zcr_mean": float(np.mean(zcr)),
            "zcr_std": float(np.std(zcr)),
            "rms_mean": float(np.mean(rms)),
            "rms_std": float(np.std(rms)),
            "spectral_flux_mean": float(np.mean(flux)),
            "spectral_flux_std": float(np.std(flux)),
        }

    def extract_cpps(self, signal: np.ndarray, sr: int) -> dict:
        """Cepstral Peak Prominence Smoothed (CPPS)."""
        frame_len = 2048
        hop = 512
        stft = np.abs(librosa.stft(signal, n_fft=frame_len, hop_length=hop)) ** 2
        
        log_spec = np.log(stft + 1e-9)
        cepstrum = np.real(np.fft.ifft(log_spec, axis=0))
        
        q_min = int(sr / F0_MAX)
        q_max = int(sr / F0_MIN)
        q_range = cepstrum[q_min:q_max, :]
        
        cep_peak = np.max(q_range, axis=0)
        
        x = np.arange(len(cep_peak))
        poly = np.polyfit(x, cep_peak, 1)
        smoothed = np.polyval(poly, x)
        cpp_values = cep_peak - smoothed

        return {
            "cpps_mean": float(np.mean(cpp_values)),
            "cpps_std": float(np.std(cpp_values)),
            "cpps_min": float(np.min(cpp_values)),
        }

    def extract_temporal_features(self, signal: np.ndarray, sr: int,
                                   n_frames: int = N_FRAMES) -> np.ndarray:
        """Divide signal into N equal windows and compute per-frame features."""
        frame_size = len(signal) // n_frames
        n_features = 19
        temporal = np.zeros((n_frames, n_features))

        full_snd = parselmouth.Sound(signal.astype(np.float64), sr)

        for i in range(n_frames):
            start_sec = (i * frame_size) / sr
            end_sec = ((i + 1) * frame_size) / sr
            seg = signal[i * frame_size : (i + 1) * frame_size]

            if len(seg) < sr * 0.1:
                continue

            seg_snd = full_snd.extract_part(
                from_time=start_sec, to_time=end_sec,
                preserve_times=False
            )
            pitch = seg_snd.to_pitch(pitch_floor=F0_MIN, pitch_ceiling=F0_MAX)
            f0_vals = pitch.selected_array["frequency"]
            f0_v = f0_vals[f0_vals > 0]
            f0_mean = float(np.mean(f0_v)) if len(f0_v) > 0 else 0.0
            f0_std = float(np.std(f0_v)) if len(f0_v) > 1 else 0.0

            try:
                harm = call(seg_snd, "To Harmonicity (cc)", 0.01, F0_MIN, 0.1, 1.0)
                hnr_v = call(harm, "Get mean", 0, 0)
                hnr_v = hnr_v if np.isfinite(hnr_v) else 0.0
            except Exception:
                hnr_v = 0.0

            rms = float(np.sqrt(np.mean(seg ** 2)))
            zcr = float(np.mean(np.abs(np.diff(np.sign(seg)))) / 2)

            win = int(0.005 * sr)
            amps = [np.max(np.abs(seg[j:j+win])) for j in range(0, len(seg)-win, win)]
            shim = float(np.std(amps) / (np.mean(amps) + 1e-9)) if len(amps) > 1 else 0.0

            mfccs_seg = librosa.feature.mfcc(y=seg.astype(np.float32), sr=sr, n_mfcc=13)
            mfcc_means = np.mean(mfccs_seg, axis=1)

            temporal[i, :6] = [f0_mean, f0_std, hnr_v, rms, zcr, shim]
            temporal[i, 6:] = mfcc_means

        return temporal

    def compute_fatigue_trajectory_stats(self, temporal: np.ndarray) -> dict:
        """Derive scalar features from the temporal matrix."""
        n = temporal.shape[0]
        n_early = max(1, int(n * 0.3))

        early = temporal[:n_early, :]
        late = temporal[-n_early:, :]

        F0_IDX, F0_STD_IDX, HNR_IDX, RMS_IDX, ZCR_IDX, SHIM_IDX = 0, 1, 2, 3, 4, 5

        feats = {}

        f0_series = temporal[:, F0_IDX]
        f0_voiced = f0_series[f0_series > 0]
        if len(f0_voiced) >= 3:
            t = np.linspace(0, 1, len(f0_voiced))
            feats["temporal_f0_slope"] = float(np.polyfit(t, f0_voiced, 1)[0])
        else:
            feats["temporal_f0_slope"] = 0.0

        feats["f0_early_late_diff"] = float(np.mean(early[:, F0_IDX]) - np.mean(late[:, F0_IDX]))
        feats["hnr_early_late_diff"] = float(np.mean(early[:, HNR_IDX]) - np.mean(late[:, HNR_IDX]))
        feats["rms_early_late_diff"] = float(np.mean(early[:, RMS_IDX]) - np.mean(late[:, RMS_IDX]))
        feats["shim_early_late_diff"] = float(np.mean(late[:, SHIM_IDX]) - np.mean(early[:, SHIM_IDX]))

        feats["f0_std_growth"] = float(np.mean(late[:, F0_STD_IDX]) / (np.mean(early[:, F0_STD_IDX]) + 1e-9))
        feats["zcr_growth"] = float(np.mean(late[:, ZCR_IDX]) / (np.mean(early[:, ZCR_IDX]) + 1e-9))

        mfcc_early = np.mean(early[:, 6:], axis=0)
        mfcc_late = np.mean(late[:, 6:], axis=0)
        feats["mfcc_drift_l2"] = float(np.linalg.norm(mfcc_late - mfcc_early))

        voiced_early = np.sum(early[:, F0_IDX] > 0) / n_early
        voiced_late = np.sum(late[:, F0_IDX] > 0) / n_early
        feats["voiced_fraction_decay"] = float(voiced_early - voiced_late)

        return feats

    def extract_all_features(self, audio_path: str) -> dict:
        """
        Extract all features from an audio file.
        
        Audio is resampled to 8000 Hz and clipped to 5 seconds to match training.
        """
        # Load audio with correct preprocessing (resample + clip)
        signal = load_audio_file(audio_path, sr=SR, duration=DURATION)
        
        # Create parselmouth Sound object from preprocessed signal
        snd = parselmouth.Sound(signal, SR)

        feats = {}
        feats.update(self.extract_f0_features(snd))
        feats.update(self.extract_jitter_shimmer(snd))
        feats.update(self.extract_hnr(snd))
        feats.update(self.extract_mfcc_features(signal, SR))
        feats.update(self.extract_spectral_features(signal, SR))
        feats.update(self.extract_cpps(signal, SR))

        temporal_mat = self.extract_temporal_features(signal, SR)
        traj_feats = self.compute_fatigue_trajectory_stats(temporal_mat)
        feats.update(traj_feats)

        return feats

    def prepare_lstm_input(self, audio_path: str) -> np.ndarray:
        """
        Prepare temporal sequence features for LSTM input.
        
        Audio is resampled to 8000 Hz and clipped to 5 seconds to match training.
        Returns shape: (1, seq_len, n_features)
        """
        # Load audio with correct preprocessing (resample + clip)
        signal = load_audio_file(audio_path, sr=SR, duration=DURATION)
        
        # Extract temporal features - shape: (n_frames, 19)
        temporal_features = self.extract_temporal_features(signal, SR)
        
        # Replace NaN with 0
        temporal_features = np.nan_to_num(temporal_features, nan=0.0)
        
        # Normalize features
        mean = np.mean(temporal_features, axis=0, keepdims=True)
        std = np.std(temporal_features, axis=0, keepdims=True) + 1e-8
        temporal_features = (temporal_features - mean) / std
        
        # Add batch dimension: (1, seq_len, n_features)
        return temporal_features[np.newaxis, :, :]

    def analyze_audio(self, audio_bytes: bytes, filename: str) -> dict:
        """
        Main method: analyze audio file and return prediction using LSTM.
        
        Args:
            audio_bytes: Raw audio file bytes
            filename: Original filename
            
        Returns:
            Dictionary with features, prediction, and confidence
        """
        file_ext = os.path.splitext(filename)[1].lower() or ".wav"
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Extract all features for display
            features = self.extract_all_features(tmp_path)
            
            result = {
                "features": features,
                "prediction": None,
                "confidence": None,
                "risk_level": None,
                "key_indicators": {},
                "model_type": "LSTM"
            }

            if self.model is not None:
                try:
                    # Prepare temporal sequence for LSTM
                    lstm_input = self.prepare_lstm_input(tmp_path)
                    
                    # Convert to PyTorch tensor
                    input_tensor = torch.FloatTensor(lstm_input).to(self.device)
                    
                    # Run inference
                    self.model.eval()
                    with torch.no_grad():
                        # Get model output
                        output = self.model(input_tensor)
                        
                        # Get probabilities
                        proba = torch.softmax(output, dim=1).cpu().numpy()[0]
                        
                        # Get prediction (class with highest probability)
                        prediction = int(np.argmax(proba))
                        confidence = float(proba[prediction])
                    
                    result["prediction"] = prediction
                    result["confidence"] = confidence
                    result["probabilities"] = {
                        "healthy": float(proba[0]) if len(proba) > 0 else None,
                        "pathological": float(proba[1]) if len(proba) > 1 else None,
                    }
                    
                    # Determine risk level based on prediction and confidence
                    if prediction == 1:  # Pathological
                        result["risk_level"] = "high" if confidence > 0.8 else "moderate"
                    else:  # Healthy
                        result["risk_level"] = "low" if confidence > 0.7 else "moderate"
                        
                except Exception as e:
                    logger.error("LSTM inference failed", exc_info=True)
                    result["model_error"] = str(e)

            result["key_indicators"] = {
                "f0_mean": features.get("f0_mean"),
                "f0_slope": features.get("f0_slope"),
                "temporal_f0_slope": features.get("temporal_f0_slope"),
                "hnr_mean": features.get("hnr_mean"),
                "jitter_local": features.get("jitter_local"),
                "shimmer_local": features.get("shimmer_local"),
            }

            return result

        finally:
            os.unlink(tmp_path)


# Create singleton service instance
audio_analysis_service = AudioAnalysisService()

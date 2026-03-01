import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils';

interface AudioRecorderProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function toMonoChannelData(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const sampleCount = audioBuffer.length;
  const mixed = new Float32Array(sampleCount);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < sampleCount; i += 1) {
      mixed[i] += channelData[i];
    }
  }

  const scale = 1 / audioBuffer.numberOfChannels;
  for (let i = 0; i < sampleCount; i += 1) {
    mixed[i] *= scale;
  }
  return mixed;
}

function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer): Blob {
  const samples = toMonoChannelData(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const numChannels = 1;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function convertRecordingBlobToWav(blob: Blob): Promise<Blob> {
  const audioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!audioContextCtor) {
    throw new Error('AudioContext not supported');
  }

  const audioContext = new audioContextCtor();
  try {
    const encoded = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(encoded.slice(0));
    return encodeWavFromAudioBuffer(decoded);
  } finally {
    await audioContext.close();
  }
}

export function AudioRecorder({ onUpload, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const mimeType = useMemo(() => getSupportedMimeType(), []);
  const isSupported = typeof navigator !== 'undefined' && typeof MediaRecorder !== 'undefined';

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const clearPreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [clearTimer, previewUrl, stopStream]);

  const startRecording = useCallback(async () => {
    if (!isSupported || disabled || isRecording || isProcessing) {
      return;
    }

    try {
      setError(null);
      setRecordedFile(null);
      clearPreviewUrl();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        clearTimer();
        stopStream();
        setIsProcessing(true);

        try {
          const outputMimeType = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: outputMimeType });
          const wavBlob = await convertRecordingBlobToWav(blob);
          const file = new File([wavBlob], `recording-${Date.now()}.wav`, {
            type: 'audio/wav',
          });
          const objectUrl = URL.createObjectURL(wavBlob);
          setPreviewUrl(objectUrl);
          setRecordedFile(file);
        } catch {
          setError('Unable to convert recording to WAV in this browser. Please upload a WAV file manually.');
        } finally {
          setIsProcessing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setError('Microphone access failed. Please allow microphone permission and try again.');
      setIsRecording(false);
      setIsProcessing(false);
      clearTimer();
      stopStream();
    }
  }, [
    clearPreviewUrl,
    clearTimer,
    disabled,
    isProcessing,
    isRecording,
    isSupported,
    mimeType,
    stopStream,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      return;
    }
    recorder.stop();
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedFile(null);
    setRecordingSeconds(0);
    setError(null);
    clearPreviewUrl();
  }, [clearPreviewUrl]);

  const handleUploadRecording = useCallback(() => {
    if (recordedFile) {
      onUpload(recordedFile);
    }
  }, [onUpload, recordedFile]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm md:p-6">
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-success-50 blur-2xl" />

      <div className="relative mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success-700">Option 1</p>
        <h3 className="mt-2 text-xl text-secondary-900">Record Audio</h3>
        <p className="mt-1 text-sm text-secondary-600">
          Use your microphone to record and send a WAV file directly for analysis.
        </p>
      </div>

      {!isSupported && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700">
          This browser does not support in-app recording. Please use the upload option.
        </div>
      )}

      {isSupported && (
        <div className="space-y-4">
          <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-700">Recording Status</p>
                <p
                  className={cn(
                    'text-xl font-semibold',
                    isRecording ? 'text-error-600' : isProcessing ? 'text-warning-700' : 'text-secondary-900'
                  )}
                >
                  {isRecording
                    ? `Recording ${formatDuration(recordingSeconds)}`
                    : isProcessing
                      ? 'Converting to WAV...'
                      : 'Ready to record'}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  isRecording
                    ? 'bg-error-100 text-error-700'
                    : isProcessing
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-secondary-200 text-secondary-700'
                )}
              >
                {isRecording ? 'LIVE' : isProcessing ? 'PROCESSING' : 'IDLE'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={startRecording}
              disabled={disabled || isRecording || isProcessing}
              className="btn-primary"
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={disabled || !isRecording || isProcessing}
              className="btn-outline"
            >
              Stop Recording
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-700">
              {error}
            </div>
          )}

          {recordedFile && (
            <div className="rounded-xl border border-secondary-200 bg-secondary-50/70 p-4">
              <p className="text-sm font-medium text-secondary-700">Recorded Clip (WAV)</p>
              <p className="mt-1 text-sm text-secondary-500">{recordedFile.name}</p>
              {previewUrl && <audio className="mt-3 w-full" controls src={previewUrl} />}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={handleUploadRecording} disabled={disabled || isProcessing} className="btn-primary">
                  Send Recording
                </button>
                <button onClick={resetRecording} disabled={disabled || isProcessing} className="btn-secondary">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

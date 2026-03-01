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

function getExtensionForMimeType(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function AudioRecorder({ onUpload, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
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
    if (!isSupported || disabled || isRecording) {
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

      recorder.onstop = () => {
        const outputMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: outputMimeType });
        const extension = getExtensionForMimeType(outputMimeType);
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: outputMimeType,
        });

        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setRecordedFile(file);

        setIsRecording(false);
        clearTimer();
        stopStream();
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
      clearTimer();
      stopStream();
    }
  }, [clearPreviewUrl, clearTimer, disabled, isRecording, isSupported, mimeType, stopStream]);

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
          Use your microphone to record and send audio directly for analysis.
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
                <p className={cn('text-xl font-semibold', isRecording ? 'text-error-600' : 'text-secondary-900')}>
                  {isRecording ? `Recording ${formatDuration(recordingSeconds)}` : 'Ready to record'}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                  isRecording ? 'bg-error-100 text-error-700' : 'bg-secondary-200 text-secondary-700'
                )}
              >
                {isRecording ? 'LIVE' : 'IDLE'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={startRecording}
              disabled={disabled || isRecording}
              className="btn-primary"
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={disabled || !isRecording}
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
              <p className="text-sm font-medium text-secondary-700">Recorded Clip</p>
              <p className="mt-1 text-sm text-secondary-500">{recordedFile.name}</p>
              {previewUrl && <audio className="mt-3 w-full" controls src={previewUrl} />}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={handleUploadRecording} disabled={disabled} className="btn-primary">
                  Send Recording
                </button>
                <button onClick={resetRecording} disabled={disabled} className="btn-secondary">
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

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/utils';

interface AudioUploaderProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function AudioUploader({ onUpload, disabled }: AudioUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidAudioFile(file)) {
        setSelectedFile(file);
      }
    }
  }, [disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidAudioFile(file)) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleUploadClick = useCallback(() => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  }, [selectedFile, onUpload]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const isValidAudioFile = (file: File): boolean => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/mp4'];
    const validExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.m4a'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return validTypes.includes(file.type) || validExtensions.includes(extension);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="card">
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragOver && !disabled
            ? 'border-primary-500 bg-primary-50'
            : 'border-secondary-300 hover:border-secondary-400',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center">
          <svg
            className={cn(
              'mb-4 h-12 w-12',
              isDragOver ? 'text-primary-500' : 'text-secondary-400'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>

          <p className="mb-2 text-lg font-medium text-secondary-700">
            {isDragOver ? 'Drop your audio file here' : 'Upload Audio File'}
          </p>
          <p className="mb-4 text-sm text-secondary-500">
            Drag and drop or click to select
          </p>
          <p className="text-xs text-secondary-400">
            Supported formats: WAV, MP3, OGG, FLAC, M4A (max 50MB)
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-4 rounded-lg bg-secondary-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-secondary-900">{selectedFile.name}</p>
                <p className="text-sm text-secondary-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="rounded-full p-1 text-secondary-400 hover:bg-secondary-200 hover:text-secondary-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className="btn-primary mt-4 w-full"
          >
            Analyze Audio
          </button>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h4 className="mb-2 font-medium text-blue-800">Recording Tips</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Record a sustained vowel /a/ for 5 seconds</li>
          <li>• Use a quiet environment with minimal background noise</li>
          <li>• Keep a consistent distance from the microphone</li>
          <li>• Maintain a comfortable, natural pitch</li>
        </ul>
      </div>
    </div>
  );
}

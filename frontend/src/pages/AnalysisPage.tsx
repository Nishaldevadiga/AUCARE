import { useState, useCallback } from 'react';
import { AudioUploader } from '@/components/analysis/AudioUploader';
import { AnalysisResult } from '@/components/analysis/AnalysisResult';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { apiClient, type ApiError } from '@/services/api';

interface AnalysisResponse {
  success: boolean;
  prediction: number | string | null;
  confidence: number | null;
  risk_level: string | null;
  features: Record<string, number> | null;
  key_indicators: Record<string, number> | null;
  error?: string;
}

export default function AnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiClient.post<AnalysisResponse>('/analysis/audio', formData, {
        headers: { 'Content-Type': undefined },
      });

      setResult(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-primary-600">Voice Analysis</h1>
          <p className="text-secondary-600">
            Upload an audio recording for acoustic feature extraction and analysis
          </p>
        </div>

        {!result && !isAnalyzing && (
          <AudioUploader onUpload={handleUpload} disabled={isAnalyzing} />
        )}

        {isAnalyzing && (
          <div className="card flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-secondary-600">Analyzing audio...</p>
            <p className="mt-2 text-sm text-secondary-400">
              Extracting acoustic features and running prediction model
            </p>
          </div>
        )}

        {error && (
          <div className="card border-error-500 bg-error-50">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-error-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-error-700">Analysis Failed</h3>
                <p className="mt-1 text-sm text-error-600">{error}</p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-sm font-medium text-error-700 hover:text-error-800"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {result && result.success && (
          <AnalysisResult result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}

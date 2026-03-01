import { useState, useCallback, useMemo } from 'react';
import { AudioRecorder, AudioUploader, AnalysisResult } from '@/components/analysis';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { apiClient, type ApiError } from '@/services/api';

interface AnalysisResponse {
  success: boolean;
  prediction: number | string | null;
  confidence: number | null;
  risk_level: string | null;
  features: Record<string, number> | null;
  key_indicators: Record<string, number> | null;
  probabilities?: { healthy: number | null; pathological: number | null } | null;
  recommendation: string | null;
  error?: string;
}

function getPredictionLabel(prediction: number | string | null): string {
  if (
    prediction === 1 ||
    String(prediction).toLowerCase() === 'mg' ||
    String(prediction).toLowerCase() === 'pathological' ||
    String(prediction).toLowerCase() === 'positive'
  ) {
    return 'Potentially pathological voice pattern detected';
  }

  return 'Voice pattern appears within healthy range';
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

  const summaryText = useMemo(() => {
    if (!result) {
      return 'AI-powered recommendation will appear here after analysis. It includes personalized guidance based on your voice fatigue indicators.';
    }

    if (result.recommendation) {
      return result.recommendation;
    }

    const confidenceText =
      result.confidence === null ? 'Confidence is not available.' : `Confidence is ${(result.confidence * 100).toFixed(1)}%.`;

    return `${getPredictionLabel(result.prediction)} ${confidenceText}`;
  }, [result]);

  const hasRecommendation = useMemo(
    () => Boolean(result?.recommendation?.trim()),
    [result]
  );

  return (
    <div className="analysis-background py-8 md:py-12">
      <div className="container-app">
        <div className="mx-auto max-w-6xl space-y-8">

          {!result && !isAnalyzing && (
            <section className="grid gap-5 lg:grid-cols-2">
              <AudioRecorder onUpload={handleUpload} disabled={isAnalyzing} />
              <AudioUploader onUpload={handleUpload} disabled={isAnalyzing} />
            </section>
          )}

          {isAnalyzing && (
            <div className="analysis-panel flex flex-col items-center justify-center py-16">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-secondary-700">Analyzing audio...</p>
              <p className="mt-2 text-sm text-secondary-500">
                Extracting acoustic features and running prediction model.
              </p>
            </div>
          )}

          {error && (
            <div className="analysis-panel border-error-300 bg-error-50">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-medium text-error-700">Analysis failed</h3>
                  <p className="mt-1 text-sm text-error-600">{error}</p>
                  <button
                    onClick={handleReset}
                    className="mt-3 text-sm font-medium text-error-700 transition-colors hover:text-error-800"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!result && (
            <section className="analysis-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl text-secondary-900">AI Recommendation</h2>
                <span className="rounded-full bg-secondary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-600">
                  Awaiting Analysis
                </span>
              </div>
              <div className="mt-4 min-h-28 rounded-xl border border-dashed border-secondary-300 bg-secondary-50 p-4">
                <p className="leading-relaxed text-secondary-500">{summaryText}</p>
              </div>
            </section>
          )}

          {result && result.success && <AnalysisResult result={result} onReset={handleReset} />}
        </div>
      </div>
    </div>
  );
}

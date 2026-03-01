import { cn } from '@/utils';

interface AnalysisResultProps {
  result: {
    prediction: number | string | null;
    confidence: number | null;
    risk_level: string | null;
    features: Record<string, number> | null;
    key_indicators: Record<string, number> | null;
  };
  onReset: () => void;
}

export function AnalysisResult({ result, onReset }: AnalysisResultProps) {
  const { prediction, confidence, risk_level, features, key_indicators } = result;

  const isPathological = prediction === 1 || 
    String(prediction).toLowerCase() === 'mg' || 
    String(prediction).toLowerCase() === 'pathological' ||
    String(prediction).toLowerCase() === 'positive';

  const getRiskColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'moderate':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'low':
      default:
        return 'text-success-600 bg-success-50 border-success-200';
    }
  };

  const getRiskIcon = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'moderate':
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(4);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const keyIndicatorLabels: Record<string, string> = {
    f0_mean: 'Fundamental Frequency (F0)',
    f0_slope: 'F0 Slope (Global)',
    temporal_f0_slope: 'Temporal F0 Slope',
    hnr_mean: 'Harmonics-to-Noise Ratio',
    jitter_local: 'Jitter (Local)',
    shimmer_local: 'Shimmer (Local)',
  };

  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <div className={cn('card border-2', getRiskColor(risk_level))}>
        <div className="flex items-start gap-4">
          <div className={cn('rounded-full p-3', getRiskColor(risk_level))}>
            {getRiskIcon(risk_level)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-secondary-900">
              Analysis Complete
            </h2>
            <p className="mt-1 text-secondary-600">
              {isPathological
                ? 'Voice patterns suggest potential pathological indicators'
                : 'Voice patterns appear within normal range'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-secondary-500">Prediction</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {isPathological ? 'Pathological' : 'Healthy'}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-secondary-500">Confidence</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {formatPercent(confidence)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-secondary-500">Risk Level</p>
            <p className={cn('mt-1 text-2xl font-bold capitalize', {
              'text-error-600': risk_level === 'high',
              'text-warning-600': risk_level === 'moderate',
              'text-success-600': risk_level === 'low',
            })}>
              {risk_level || 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Key Indicators */}
      {key_indicators && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">
            Key Voice Indicators
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(key_indicators).map(([key, value]) => (
              <div key={key} className="rounded-lg bg-secondary-50 p-4">
                <p className="text-sm text-secondary-500">
                  {keyIndicatorLabels[key] || key}
                </p>
                <p className="mt-1 text-xl font-semibold text-secondary-900">
                  {formatValue(value as number)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Features (Collapsible) */}
      {features && (
        <details className="card">
          <summary className="cursor-pointer text-lg font-semibold text-secondary-900">
            All Extracted Features ({Object.keys(features).length})
          </summary>
          <div className="mt-4 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-secondary-600">Feature</th>
                  <th className="pb-2 text-right font-medium text-secondary-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {Object.entries(features)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <tr key={key} className="hover:bg-secondary-50">
                      <td className="py-2 text-secondary-700">{key}</td>
                      <td className="py-2 text-right font-mono text-secondary-900">
                        {formatValue(value as number)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-secondary-50 p-4">
        <p className="text-sm text-secondary-600">
          <strong>Disclaimer:</strong> This analysis is for research and informational purposes only. 
          It is not intended to diagnose, treat, or prevent any medical condition. 
          Please consult a healthcare professional for medical advice.
        </p>
      </div>

      {/* Action Button */}
      <button onClick={onReset} className="btn-primary w-full">
        Analyze Another Recording
      </button>
    </div>
  );
}

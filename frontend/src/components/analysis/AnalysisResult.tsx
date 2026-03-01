import { cn } from '@/utils';
import { useMemo } from 'react';

interface AnalysisResultProps {
  result: {
    prediction: number | string | null;
    confidence: number | null;
    risk_level: string | null;
    features: Record<string, number> | null;
    key_indicators: Record<string, number> | null;
    probabilities?: { healthy: number | null; pathological: number | null } | null;
    recommendation: string | null;
  };
  onReset: () => void;
}

interface ParsedLine {
  type: 'heading' | 'subheading' | 'bullet' | 'numbered' | 'paragraph' | 'empty';
  content: string;
  number?: number;
}

function parseRecommendation(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === '') {
      parsed.push({ type: 'empty', content: '' });
    } else if (/^#{1,2}\s/.test(trimmed)) {
      parsed.push({ type: 'heading', content: trimmed.replace(/^#{1,2}\s*/, '') });
    } else if (/^#{3,}\s/.test(trimmed)) {
      parsed.push({ type: 'subheading', content: trimmed.replace(/^#{3,}\s*/, '') });
    } else if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      parsed.push({ type: 'subheading', content: trimmed.replace(/\*\*/g, '').replace(/:$/, '') });
    } else if (/^(\d+)\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s*(.*)$/);
      if (match) {
        parsed.push({ type: 'numbered', content: match[2], number: parseInt(match[1]) });
      }
    } else if (/^[-*•]\s/.test(trimmed)) {
      parsed.push({ type: 'bullet', content: trimmed.replace(/^[-*•]\s*/, '') });
    } else {
      parsed.push({ type: 'paragraph', content: trimmed });
    }
  }

  return parsed;
}

function formatInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={key++} className="font-semibold text-secondary-900">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return parts;
}

function RecommendationContent({ text }: { text: string }) {
  const parsed = useMemo(() => parseRecommendation(text), [text]);

  return (
    <div className="space-y-4">
      {parsed.map((line, index) => {
        switch (line.type) {
          case 'heading':
            return (
              <h4 key={index} className="flex items-center gap-2 text-base font-semibold text-primary-800 border-b border-primary-200 pb-2 mt-4 first:mt-0">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-200 text-xs font-bold text-primary-700">
                  {index + 1}
                </span>
                {formatInlineText(line.content)}
              </h4>
            );
          case 'subheading':
            return (
              <h5 key={index} className="flex items-center gap-2 text-sm font-semibold text-primary-700 mt-3">
                <svg className="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {formatInlineText(line.content)}
              </h5>
            );
          case 'numbered':
            return (
              <div key={index} className="flex gap-3 pl-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-sm">
                  {line.number}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-secondary-700 pt-0.5">
                  {formatInlineText(line.content)}
                </p>
              </div>
            );
          case 'bullet':
            return (
              <div key={index} className="flex gap-3 pl-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                <p className="flex-1 text-sm leading-relaxed text-secondary-700">
                  {formatInlineText(line.content)}
                </p>
              </div>
            );
          case 'paragraph':
            return (
              <p key={index} className="text-sm leading-relaxed text-secondary-700 pl-2">
                {formatInlineText(line.content)}
              </p>
            );
          case 'empty':
            return <div key={index} className="h-2" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export function AnalysisResult({ result, onReset }: AnalysisResultProps) {
  const { prediction, confidence, risk_level, features, key_indicators, recommendation } = result;

  const isFatigued = prediction === 1 ||
    String(prediction).toLowerCase() === 'mg' ||
    String(prediction).toLowerCase() === 'pathological' ||
    String(prediction).toLowerCase() === 'fatigue' ||
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
              {isFatigued
                ? 'Voice patterns suggest signs of vocal fatigue'
                : 'Voice patterns appear within normal range'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm text-secondary-500">Status</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {isFatigued ? 'Fatigue Detected' : 'No Fatigue'}
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

      {/* AI Recommendation */}
      {recommendation && (
        <div className="card overflow-hidden border-0 bg-gradient-to-br from-primary-50 via-white to-primary-50 shadow-lg ring-1 ring-primary-100">
          <div className="border-b border-primary-100 bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Personalized Recommendation
                </h3>
                <p className="text-sm text-primary-100">
                  AI-powered guidance based on your voice analysis
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <RecommendationContent text={recommendation} />
          </div>
          <div className="border-t border-primary-100 bg-primary-50/50 px-6 py-3">
            <p className="flex items-center gap-2 text-xs text-primary-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generated by AI for informational purposes. Always consult your healthcare provider.
            </p>
          </div>
        </div>
      )}

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

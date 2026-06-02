import type { RoundAnalysis, RoundStats } from "@/lib/types";

interface Props {
  analysis: RoundAnalysis;
  onGeneratePlan: () => void;
  planLoading: boolean;
}

type KpiLevel = "good" | "average" | "poor";

const KPI_STYLES: Record<KpiLevel, { dot: string; text: string; label: string; border: string }> = {
  good:    { dot: "bg-green-500",  text: "text-green-700",  label: "Good",    border: "border-b-2 border-green-400" },
  average: { dot: "bg-yellow-400", text: "text-yellow-600", label: "Average", border: "border-b-2 border-yellow-400" },
  poor:    { dot: "bg-red-500",    text: "text-red-600",    label: "Improve", border: "border-b-2 border-red-400" },
};

function getKpiLevel(key: string, stats: RoundStats): KpiLevel {
  switch (key) {
    case "putts": {
      const v = stats.putts_per_hole;
      return v <= 1.8 ? "good" : v <= 2.1 ? "average" : "poor";
    }
    case "fairways": {
      if (stats.fairways_attempted === 0) return "average";
      const v = stats.fairway_percentage;
      return v >= 60 ? "good" : v >= 40 ? "average" : "poor";
    }
    case "gir": {
      const v = stats.gir_percentage;
      return v >= 50 ? "good" : v >= 30 ? "average" : "poor";
    }
    case "penalties": {
      const v = stats.total_penalties;
      return v === 0 ? "good" : v <= 2 ? "average" : "poor";
    }
    default:
      return "average";
  }
}

export default function RoundAnalysisCard({ analysis, onGeneratePlan, planLoading }: Props) {
  const { stats, strengths, weaknesses, ai_insights, submission } = analysis;
  const sign = stats.score_vs_par > 0 ? "+" : "";
  const scoreLabel = stats.score_vs_par === 0 ? "E" : `${sign}${stats.score_vs_par}`;

  const kpiStats = [
    { key: "putts",     label: "Putts / Hole", value: stats.putts_per_hole.toFixed(1) },
    { key: "fairways",  label: "Fairways",     value: stats.fairways_attempted > 0 ? `${stats.fairway_percentage}%` : "N/A" },
    { key: "gir",       label: "GIR",          value: `${stats.gir_percentage}%` },
    { key: "penalties", label: "Penalties",    value: String(stats.total_penalties) },
  ];

  const scoringItems = [
    { label: "Eagles+", value: stats.scoring_breakdown.eagles_or_better, color: "bg-purple-100 text-purple-800" },
    { label: "Birdies",  value: stats.scoring_breakdown.birdies,          color: "bg-blue-100 text-blue-800" },
    { label: "Pars",     value: stats.scoring_breakdown.pars,             color: "bg-green-100 text-green-800" },
    { label: "Bogeys",   value: stats.scoring_breakdown.bogeys,           color: "bg-yellow-100 text-yellow-800" },
    { label: "Doubles",  value: stats.scoring_breakdown.double_bogeys,    color: "bg-orange-100 text-orange-800" },
    { label: "Triples+", value: stats.scoring_breakdown.triple_or_worse,  color: "bg-red-100 text-red-800" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{submission.player_name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {submission.course_name} · {submission.tee_box} tees · {submission.date}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-bold text-gray-900">{stats.total_score}</div>
            <div className={`text-lg font-semibold ${stats.score_vs_par <= 0 ? "text-green-600" : "text-red-500"}`}>
              {scoreLabel}
            </div>
          </div>
        </div>

        {/* Traffic light KPI grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpiStats.map(({ key, label, value }) => {
            const level = getKpiLevel(key, stats);
            const style = KPI_STYLES[level];
            return (
              <div
                key={key}
                className={`rounded-lg bg-gray-50 p-3 text-center ${style.border}`}
              >
                <div className={`text-xl font-bold ${style.text}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {scoringItems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {scoringItems.map((s) => (
              <span
                key={s.label}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${s.color}`}
              >
                <span className="font-bold">{s.value}</span> {s.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Strengths & weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {strengths.length > 0 && (
            <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3">Strengths</h3>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">Areas to Improve</h3>
              <ul className="space-y-2">
                {weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* AI insights */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coach&apos;s Analysis</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ai_insights}</p>
      </div>

      {/* Practice plan CTA */}
      <div className="bg-green-50 rounded-xl border border-green-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">Ready to improve?</h3>
          <p className="text-sm text-gray-600 mt-0.5">Generate a personalized practice plan based on this round.</p>
        </div>
        <button
          onClick={onGeneratePlan}
          disabled={planLoading}
          className="shrink-0 rounded-md bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {planLoading ? "Generating…" : "Generate Practice Plan"}
        </button>
      </div>
    </div>
  );
}

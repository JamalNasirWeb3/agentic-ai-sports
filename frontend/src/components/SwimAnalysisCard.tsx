"use client";

import { useState } from "react";
import type { SwimAnalysis, TechniqueRating } from "@/lib/types";

interface Props {
  analysis: SwimAnalysis;
}

const STROKE_LABELS: Record<string, string> = {
  freestyle: "Freestyle",
  backstroke: "Backstroke",
  breaststroke: "Breaststroke",
  butterfly: "Butterfly",
};

type KpiLevel = "good" | "fair" | "poor";

const KPI_STYLES: Record<KpiLevel, { dot: string; text: string; label: string; border: string }> = {
  good: { dot: "bg-green-500",  text: "text-green-700",  label: "Good",    border: "border-b-2 border-green-400" },
  fair: { dot: "bg-yellow-400", text: "text-yellow-600", label: "Fair",    border: "border-b-2 border-yellow-400" },
  poor: { dot: "bg-red-500",    text: "text-red-600",    label: "Improve", border: "border-b-2 border-red-400" },
};

function kpiLevel(rating: TechniqueRating["rating"]): KpiLevel {
  if (rating === "good" || rating === "fair" || rating === "poor") return rating;
  return "fair";
}

export default function SwimAnalysisCard({ analysis }: Props) {
  const [activeFrame, setActiveFrame] = useState<number | null>(null);

  const pairs = analysis.annotated_frames.map((b64, i) => ({
    src: `data:image/jpeg;base64,${b64}`,
    phase: analysis.swim_phases[i] ?? null,
    index: i,
  }));

  const strokeLabel = STROKE_LABELS[analysis.stroke] ?? analysis.stroke;

  return (
    <div className="space-y-5">
      {/* Header + KPI grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900">Stroke Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          {strokeLabel} · {analysis.video_filename} · {analysis.frames_analyzed} frames
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-4">{analysis.overall_assessment}</p>

        {/* Traffic light technique KPIs */}
        {analysis.technique_ratings.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {analysis.technique_ratings.map((r) => {
              const level = kpiLevel(r.rating);
              const style = KPI_STYLES[level];
              return (
                <div key={r.area} className={`rounded-lg bg-gray-50 p-3 text-center ${style.border}`}>
                  <div className="text-xs font-semibold text-gray-800 leading-tight">{r.area}</div>
                  <div className="mt-1.5 text-xs text-gray-500 leading-snug line-clamp-2">{r.note}</div>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strengths & improvements */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {analysis.key_strengths.length > 0 && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-3">Strengths</h3>
            <ul className="space-y-2">
              {analysis.key_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 shrink-0 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.areas_for_improvement.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
            <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">Areas to Improve</h3>
            <ul className="space-y-2">
              {analysis.areas_for_improvement.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-400 shrink-0 mt-0.5">•</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Annotated frame gallery */}
      {pairs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Annotated Frames
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pairs.map(({ src, phase, index }) => (
              <button
                key={index}
                onClick={() => setActiveFrame(activeFrame === index ? null : index)}
                className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                  activeFrame === index
                    ? "border-blue-600 shadow-md"
                    : "border-transparent hover:border-blue-400"
                }`}
              >
                <img
                  src={src}
                  alt={phase?.phase ?? `Frame ${index + 1}`}
                  className="w-full object-cover"
                />
                {activeFrame === index && (
                  <div className="absolute inset-0 ring-2 ring-inset ring-blue-600 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          {/* Expanded view */}
          {activeFrame !== null && pairs[activeFrame] && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
              <img
                src={pairs[activeFrame].src}
                alt={pairs[activeFrame].phase?.phase ?? `Frame ${activeFrame + 1}`}
                className="w-full object-contain max-h-[480px] bg-black"
              />
              {pairs[activeFrame].phase?.observation && (
                <div className="p-4 bg-gray-50 text-sm text-gray-700 leading-relaxed">
                  {pairs[activeFrame].phase!.observation}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase timeline */}
      {analysis.swim_phases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Frame-by-Frame Breakdown
          </h3>
          <div className="space-y-0">
            {analysis.swim_phases.map((phase, i) => {
              const hasNote = !!phase.suggestion;
              return (
                <div
                  key={i}
                  className={`flex gap-4 cursor-pointer rounded-lg transition-colors px-2 -mx-2 ${
                    activeFrame === i ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveFrame(activeFrame === i ? null : i)}
                >
                  {/* Spine */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-colors ${
                        activeFrame === i ? "bg-blue-500" : "bg-blue-700"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < analysis.swim_phases.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-6 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          hasNote ? "bg-yellow-400" : "bg-green-500"
                        }`}
                      />
                      <h4 className="text-sm font-semibold text-gray-900">{phase.phase}</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mt-1 line-clamp-2">
                      {phase.observation}
                    </p>
                    {phase.suggestion && (
                      <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1 text-xs font-semibold text-yellow-800">
                        <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {phase.suggestion}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended drills */}
      {analysis.recommended_drills.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Drills</h3>
          <ol className="space-y-2">
            {analysis.recommended_drills.map((drill, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 font-bold shrink-0">{i + 1}.</span> {drill}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

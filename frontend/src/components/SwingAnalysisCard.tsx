"use client";

import { useState } from "react";
import type { SwingAnalysis } from "@/lib/types";

interface Props {
  analysis: SwingAnalysis;
}

export default function SwingAnalysisCard({ analysis }: Props) {
  const [activeFrame, setActiveFrame] = useState<number | null>(null);

  const pairs = analysis.annotated_frames.map((b64, i) => ({
    src: `data:image/jpeg;base64,${b64}`,
    phase: analysis.swing_phases[i] ?? null,
    index: i,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900">Swing Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          {analysis.club} · {analysis.video_filename} · {analysis.frames_analyzed} frames
        </p>
        <p className="text-sm text-gray-700 leading-relaxed mt-4">{analysis.overall_assessment}</p>
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
                    ? "border-green-600 shadow-md"
                    : "border-transparent hover:border-green-400"
                }`}
              >
                <img
                  src={src}
                  alt={phase?.phase ?? `Frame ${index + 1}`}
                  className="w-full object-cover"
                />
                {activeFrame === index && (
                  <div className="absolute inset-0 ring-2 ring-inset ring-green-600 rounded-lg pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          {/* Expanded view for selected frame */}
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
      {analysis.swing_phases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">
            Frame-by-Frame Breakdown
          </h3>
          <div className="space-y-0">
            {analysis.swing_phases.map((phase, i) => (
              <div
                key={i}
                className={`flex gap-4 cursor-pointer rounded-lg transition-colors px-2 -mx-2 ${
                  activeFrame === i ? "bg-green-50" : "hover:bg-gray-50"
                }`}
                onClick={() => setActiveFrame(activeFrame === i ? null : i)}
              >
                {/* Spine */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-colors ${
                      activeFrame === i ? "bg-green-600" : "bg-green-700"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < analysis.swing_phases.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{phase.phase}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{phase.observation}</p>
                  {phase.suggestion && (
                    <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM6.293 5.293a1 1 0 011.414 0L8.414 6a1 1 0 01-1.414 1.414L6.293 6.707a1 1 0 010-1.414zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM15 10a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM13.707 5.293a1 1 0 010 1.414l-.707.707A1 1 0 0111.586 6l.707-.707a1 1 0 011.414 0zM10 14a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM7 10a3 3 0 116 0 3 3 0 01-6 0z" />
                      </svg>
                      {phase.suggestion}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Recommended drills */}
      {analysis.recommended_drills.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Drills</h3>
          <ol className="space-y-2">
            {analysis.recommended_drills.map((drill, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 font-bold shrink-0">{i + 1}.</span> {drill}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

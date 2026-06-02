"use client";

import { useState } from "react";
import SwingUpload from "@/components/SwingUpload";
import SwingAnalysisCard from "@/components/SwingAnalysisCard";
import { analyzeSwing } from "@/lib/api";
import type { SwingAnalysis } from "@/lib/types";

export default function SwingPage() {
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File, club: string) {
    setLoading(true);
    setError(null);
    try {
      setAnalysis(await analyzeSwing(file, club));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze swing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Swing Analyzer</h1>
          <p className="mt-1 text-gray-600">
            Upload a swing video to get frame-by-frame AI coaching feedback on your mechanics.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!analysis ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <SwingUpload onSubmit={handleUpload} loading={loading} />
          </div>
        ) : (
          <div className="space-y-6">
            <SwingAnalysisCard analysis={analysis} />
            <button
              onClick={() => { setAnalysis(null); setError(null); }}
              className="text-sm text-green-700 hover:text-green-900 hover:underline"
            >
              ← Analyze another swing
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

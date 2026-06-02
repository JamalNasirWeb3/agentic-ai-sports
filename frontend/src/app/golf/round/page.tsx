"use client";

import { useState } from "react";
import RoundForm from "@/components/RoundForm";
import RoundAnalysisCard from "@/components/RoundAnalysisCard";
import PracticePlanCard from "@/components/PracticePlanCard";
import { analyzeRound, generatePracticePlan } from "@/lib/api";
import type { PracticePlan, RoundAnalysis, RoundSubmission } from "@/lib/types";

export default function RoundPage() {
  const [analysis, setAnalysis] = useState<RoundAnalysis | null>(null);
  const [practicePlan, setPracticePlan] = useState<PracticePlan | null>(null);
  const [roundLoading, setRoundLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRoundSubmit(submission: RoundSubmission) {
    setRoundLoading(true);
    setError(null);
    try {
      const result = await analyzeRound(submission);
      setAnalysis(result);
      setPracticePlan(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze round");
    } finally {
      setRoundLoading(false);
    }
  }

  async function handleGeneratePlan() {
    if (!analysis) return;
    setPlanLoading(true);
    setError(null);
    try {
      setPracticePlan(await generatePracticePlan(analysis));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate practice plan");
    } finally {
      setPlanLoading(false);
    }
  }

  function reset() {
    setAnalysis(null);
    setPracticePlan(null);
    setError(null);
  }

  return (
    <main className="min-h-screen py-10">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Round Analyzer</h1>
          <p className="mt-1 text-gray-600">
            Enter your scorecard to get AI-powered insights and a personalized practice plan.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!analysis ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <RoundForm onSubmit={handleRoundSubmit} loading={roundLoading} />
          </div>
        ) : (
          <div className="space-y-6">
            <RoundAnalysisCard
              analysis={analysis}
              onGeneratePlan={handleGeneratePlan}
              planLoading={planLoading}
            />
            {practicePlan && <PracticePlanCard plan={practicePlan} />}
            <button
              onClick={reset}
              className="text-sm text-green-700 hover:text-green-900 hover:underline"
            >
              ← Analyze another round
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

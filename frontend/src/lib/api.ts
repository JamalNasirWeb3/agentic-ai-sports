import type { PracticePlan, RoundAnalysis, RoundSubmission, SwimAnalysis, SwingAnalysis } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      message = JSON.parse(body)?.detail ?? message;
    } catch {
      message = body || message;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function analyzeRound(submission: RoundSubmission): Promise<RoundAnalysis> {
  return request("/api/golf/rounds/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
}

export function generatePracticePlan(analysis: RoundAnalysis): Promise<PracticePlan> {
  return request("/api/golf/practice-plans/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(analysis),
  });
}

export function analyzeSwing(video: File, club: string): Promise<SwingAnalysis> {
  const form = new FormData();
  form.append("video", video);
  form.append("club", club);
  return request("/api/golf/swings/analyze", { method: "POST", body: form });
}

export function analyzeSwim(video: File, stroke: string): Promise<SwimAnalysis> {
  const form = new FormData();
  form.append("video", video);
  form.append("stroke", stroke);
  return request("/api/swimming/analyze", { method: "POST", body: form });
}

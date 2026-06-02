export interface HoleData {
  hole_number: number;
  par: number;
  score: number;
  putts: number;
  fairway_hit: boolean | null;
  gir: boolean;
  penalty_strokes: number;
}

export interface RoundSubmission {
  player_name: string;
  course_name: string;
  date: string;
  tee_box: string;
  handicap: number | null;
  holes: HoleData[];
}

export interface ScoringBreakdown {
  eagles_or_better: number;
  birdies: number;
  pars: number;
  bogeys: number;
  double_bogeys: number;
  triple_or_worse: number;
}

export interface RoundStats {
  total_score: number;
  total_par: number;
  score_vs_par: number;
  total_putts: number;
  putts_per_hole: number;
  fairways_hit: number;
  fairways_attempted: number;
  fairway_percentage: number;
  greens_in_regulation: number;
  gir_percentage: number;
  total_penalties: number;
  scoring_breakdown: ScoringBreakdown;
  avg_score_par3: number;
  avg_score_par4: number;
  avg_score_par5: number;
  front_nine_score: number | null;
  back_nine_score: number | null;
}

export interface RoundAnalysis {
  round_id: string;
  submission: RoundSubmission;
  stats: RoundStats;
  strengths: string[];
  weaknesses: string[];
  ai_insights: string;
}

export interface PracticeDrill {
  name: string;
  description: string;
  duration_minutes: number;
  focus_area: string;
}

export interface PracticeSession {
  day: number;
  total_duration_minutes: number;
  location: string;
  drills: PracticeDrill[];
}

export interface PracticePlan {
  plan_id: string;
  round_id: string;
  focus_areas: string[];
  sessions: PracticeSession[];
  coaching_notes: string;
}

export interface SwingPhase {
  phase: string;
  observation: string;
  suggestion: string | null;
}

export interface SwingAnalysis {
  swing_id: string;
  video_filename: string;
  frames_analyzed: number;
  club: string;
  overall_assessment: string;
  swing_phases: SwingPhase[];
  key_strengths: string[];
  areas_for_improvement: string[];
  recommended_drills: string[];
  annotated_frames: string[]; // base64 JPEG, one per frame
}

export interface SwimPhase {
  phase: string;
  observation: string;
  suggestion: string | null;
}

export interface TechniqueRating {
  area: string;
  rating: "good" | "fair" | "poor";
  note: string;
}

export interface SwimAnalysis {
  swim_id: string;
  video_filename: string;
  frames_analyzed: number;
  stroke: string;
  overall_assessment: string;
  swim_phases: SwimPhase[];
  technique_ratings: TechniqueRating[];
  key_strengths: string[];
  areas_for_improvement: string[];
  recommended_drills: string[];
  annotated_frames: string[]; // base64 JPEG, one per frame
}

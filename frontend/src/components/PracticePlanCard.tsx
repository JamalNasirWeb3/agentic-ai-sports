import type { PracticePlan } from "@/lib/types";

interface Props {
  plan: PracticePlan;
}

const FOCUS_COLORS: Record<string, string> = {
  putting: "bg-blue-100 text-blue-800",
  driving: "bg-orange-100 text-orange-800",
  iron_play: "bg-purple-100 text-purple-800",
  short_game: "bg-yellow-100 text-yellow-800",
  course_management: "bg-teal-100 text-teal-800",
  par_3: "bg-pink-100 text-pink-800",
  par_5: "bg-indigo-100 text-indigo-800",
};

export default function PracticePlanCard({ plan }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Practice Plan</h2>
        <div className="flex flex-wrap gap-2">
          {plan.focus_areas.map((area) => (
            <span
              key={area}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${FOCUS_COLORS[area] ?? "bg-gray-100 text-gray-700"}`}
            >
              {area.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      {/* Sessions */}
      {plan.sessions.map((session) => (
        <div key={session.day} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Day {session.day}</h3>
            <span className="text-xs text-gray-500">
              {session.location} · {session.total_duration_minutes} min
            </span>
          </div>
          <div className="space-y-3">
            {session.drills.map((drill, i) => (
              <div key={i} className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{drill.name}</h4>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{drill.description}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-500 whitespace-nowrap">
                    {drill.duration_minutes} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Coaching notes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coaching Notes</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{plan.coaching_notes}</p>
      </div>
    </div>
  );
}

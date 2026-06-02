"use client";

import React, { useState } from "react";
import type { HoleData, RoundSubmission } from "@/lib/types";

interface Props {
  onSubmit: (submission: RoundSubmission) => void;
  loading: boolean;
}

function initHoles(count: number): HoleData[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    score: 4,
    putts: 2,
    fairway_hit: false,
    gir: false,
    penalty_strokes: 0,
  }));
}

export default function RoundForm({ onSubmit, loading }: Props) {
  const [playerName, setPlayerName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teeBox, setTeeBox] = useState("White");
  const [handicap, setHandicap] = useState("");
  const [holeCount, setHoleCount] = useState(18);
  const [holes, setHoles] = useState<HoleData[]>(initHoles(18));

  function updateHole(index: number, field: keyof HoleData, value: number | boolean | null) {
    setHoles((prev) => {
      const next = [...prev];
      const hole = { ...next[index] };
      if (field === "par") {
        hole.par = value as number;
        hole.fairway_hit = hole.par === 3 ? null : hole.fairway_hit === null ? false : hole.fairway_hit;
      } else {
        (hole as Record<string, unknown>)[field] = value;
      }
      next[index] = hole;
      return next;
    });
  }

  function handleHoleCount(count: number) {
    setHoleCount(count);
    setHoles((prev) =>
      count > prev.length
        ? [...prev, ...initHoles(count).slice(prev.length)]
        : prev
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      player_name: playerName,
      course_name: courseName,
      date,
      tee_box: teeBox,
      handicap: handicap ? parseFloat(handicap) : null,
      holes: holes.slice(0, holeCount),
    });
  }

  const displayHoles = holes.slice(0, holeCount);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Player info */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Player Name", value: playerName, onChange: setPlayerName, type: "text", required: true },
          { label: "Course Name", value: courseName, onChange: setCourseName, type: "text", required: true },
          { label: "Date", value: date, onChange: setDate, type: "date", required: true },
        ].map(({ label, value, onChange, type, required }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              required={required}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tee Box</label>
          <select
            value={teeBox}
            onChange={(e) => setTeeBox(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {["Black", "Blue", "White", "Gold", "Red"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Handicap (optional)</label>
          <input
            type="number"
            min="0"
            max="54"
            step="0.1"
            value={handicap}
            onChange={(e) => setHandicap(e.target.value)}
            placeholder="e.g. 14.5"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Holes Played</label>
          <select
            value={holeCount}
            onChange={(e) => handleHoleCount(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value={9}>9 holes</option>
            <option value={18}>18 holes</option>
          </select>
        </div>
      </div>

      {/* Scorecard */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Scorecard</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-green-700 text-white">
              <tr>
                {["Hole", "Par", "Score", "Putts", "FW", "GIR", "Pen"].map((h) => (
                  <th key={h} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayHoles.map((hole, i) => (
                <React.Fragment key={hole.hole_number}>
                  {i === 9 && holeCount === 18 && (
                    <tr className="bg-green-50">
                      <td colSpan={7} className="px-3 py-1 text-xs font-semibold text-green-700 text-center tracking-wide">
                        — Back Nine —
                      </td>
                    </tr>
                  )}
                  <tr className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-1.5 text-center font-medium text-gray-700 w-10">
                      {hole.hole_number}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={hole.par}
                        onChange={(e) => updateHole(i, "par", Number(e.target.value))}
                        className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-sm bg-white"
                      >
                        {[3, 4, 5].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        required
                        min={1}
                        max={15}
                        value={hole.score}
                        onChange={(e) => updateHole(i, "score", Number(e.target.value))}
                        className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        required
                        min={0}
                        max={10}
                        value={hole.putts}
                        onChange={(e) => updateHole(i, "putts", Number(e.target.value))}
                        className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {hole.par === 3 ? (
                        <span className="text-xs text-gray-400">N/A</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={hole.fairway_hit === true}
                          onChange={(e) => updateHole(i, "fairway_hit", e.target.checked)}
                          className="h-4 w-4 rounded accent-green-600 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={hole.gir}
                        onChange={(e) => updateHole(i, "gir", e.target.checked)}
                        className="h-4 w-4 rounded accent-green-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={hole.penalty_strokes}
                        onChange={(e) => updateHole(i, "penalty_strokes", Number(e.target.value))}
                        className="w-14 rounded border border-gray-200 px-1 py-1 text-center text-sm"
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">FW = Fairway hit (N/A on par 3s) · GIR = Green in Regulation · Pen = Penalty strokes</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analyzing round…" : "Analyze Round"}
      </button>
    </form>
  );
}

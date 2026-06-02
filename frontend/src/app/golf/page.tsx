import Link from "next/link";

const FEATURES = [
  {
    href: "/golf/round",
    emoji: "📊",
    title: "Round Analyzer",
    description:
      "Enter your scorecard to get AI-powered insights on putting, driving, GIR, and scoring patterns — plus a personalized practice plan.",
    cta: "Analyze a round",
  },
  {
    href: "/golf/swing",
    emoji: "🎥",
    title: "Swing Analyzer",
    description:
      "Upload a swing video and get frame-by-frame coaching feedback on your mechanics, with specific drills to address weaknesses.",
    cta: "Analyze a swing",
  },
];

export default function GolfPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Golf</h1>
          <p className="mt-2 text-gray-600">AI-powered tools to analyze your game and build better practice habits.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl bg-white border border-gray-200 shadow-sm p-8 hover:border-green-400 hover:shadow-md transition-all"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                {f.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.description}</p>
              <span className="mt-5 inline-block text-sm font-medium text-green-700 group-hover:underline">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

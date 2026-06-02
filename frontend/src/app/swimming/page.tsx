import Link from "next/link";

const FEATURES = [
  {
    href: "/swimming/video",
    emoji: "🎥",
    title: "Stroke Analyzer",
    description:
      "Upload a swimming video and get frame-by-frame AI coaching feedback on your technique, with stroke-specific drills to address weaknesses.",
    cta: "Analyze a stroke",
  },
];

export default function SwimmingPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Swimming</h1>
          <p className="mt-2 text-gray-600">AI-powered tools to analyze your stroke mechanics and build better technique.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-xl bg-white border border-gray-200 shadow-sm p-8 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="text-4xl mb-4">{f.emoji}</div>
              <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {f.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.description}</p>
              <span className="mt-5 inline-block text-sm font-medium text-blue-700 group-hover:underline">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

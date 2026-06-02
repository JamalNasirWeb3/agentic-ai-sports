import Link from "next/link";

const SPORTS = [
  { name: "Golf", emoji: "⛳", href: "/golf", live: true, description: "Round analyzer, swing analysis, and practice plan generator." },
  { name: "Swimming", emoji: "🏊", href: "/swimming", live: true, description: "AI stroke analyzer with frame-by-frame technique feedback and drill recommendations." },
  { name: "Baseball", emoji: "⚾", href: null, live: false, description: "AI-powered training for baseball players." },
  { name: "Tennis", emoji: "🎾", href: null, live: false, description: "AI-powered training for tennis players." },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900">AI Sports Platform</h1>
        <p className="mt-3 text-lg text-gray-600 max-w-xl">
          Turn your games, rounds, and practices into personalized training plans powered by AI.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SPORTS.map((sport) =>
            sport.href ? (
              <Link
                key={sport.name}
                href={sport.href}
                className="group rounded-xl bg-white border border-gray-200 shadow-sm p-6 hover:border-green-400 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-3">{sport.emoji}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                    {sport.name}
                  </h2>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Live
                  </span>
                </div>
                <p className="text-sm text-gray-600">{sport.description}</p>
              </Link>
            ) : (
              <div
                key={sport.name}
                className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 opacity-50 cursor-not-allowed"
              >
                <div className="text-3xl mb-3">{sport.emoji}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="font-semibold text-gray-900">{sport.name}</h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-400">{sport.description}</p>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}

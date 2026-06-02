import Link from "next/link";

export default function Nav() {
  return (
    <nav className="bg-green-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight hover:text-green-200 transition-colors">
          AI Sports Platform
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link href="/golf" className="hover:text-green-200 transition-colors">
            Golf
          </Link>
        </div>
      </div>
    </nav>
  );
}

import Link from "next/link";

/**
 * 404 Not Found page.
 * Displays when a page doesn't exist.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <span className="text-8xl font-bold text-zinc-200 dark:text-zinc-800">
            404
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Page Not Found
        </h1>

        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Sorry, the page you are looking for does not exist or has been removed.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to Home
          </Link>
          <Link
            href="/projects"
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            View Projects
          </Link>
        </div>
      </div>
    </div>
  );
}

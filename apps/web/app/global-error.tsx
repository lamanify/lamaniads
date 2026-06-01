'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error.message}</p>
            <button
              onClick={reset}
              className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

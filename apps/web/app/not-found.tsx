export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">404</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Page not found</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

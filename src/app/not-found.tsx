import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        404 · Not Found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        That page isn&apos;t in the dojo
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Try searching with ⌘K or head back to the curriculum.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/curriculum"
          className="flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition duration-200 hover:opacity-90"
        >
          Browse curriculum
        </Link>
        <Link
          href="/"
          className="flex h-10 items-center rounded-full bg-surface px-5 text-sm font-medium text-foreground transition duration-200 hover:bg-foreground/10"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

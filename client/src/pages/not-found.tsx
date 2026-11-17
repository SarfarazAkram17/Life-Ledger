import { Compass, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,hsl(var(--primary)/0.12),transparent_58%)]"
      />
      <div className="relative w-full max-w-xl">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
            L
          </span>
          <span className="text-base font-semibold tracking-tight">
            LifeLedger
          </span>
        </div>

        <section className="rounded-3xl border border-border bg-card/90 px-6 py-10 text-center shadow-2xl shadow-black/20 backdrop-blur sm:px-12 sm:py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Compass aria-hidden="true" className="h-7 w-7" strokeWidth={1.8} />
          </div>

          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            We couldn’t find that page.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            The address may be incorrect, or the page may have moved. You can
            head back to LifeLedger and continue from there.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              aria-label="Go home"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <Home aria-hidden="true" className="h-4 w-4" />
              Go home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
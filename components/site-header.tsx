import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight"
        >
          Voyago<span className="text-[color:var(--ochre)]">.</span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <span>Itinéraires sur-mesure</span>
          <span>Vols & hébergement</span>
        </nav>
      </div>
    </header>
  );
}

import { SearchForm } from "@/components/search-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--ochre) 28%, transparent), transparent 70%), radial-gradient(40% 35% at 90% 20%, color-mix(in oklab, var(--brand) 22%, transparent), transparent 70%)",
            }}
          />
          <div className="mx-auto w-full max-w-3xl px-4 pt-16 pb-10 md:pt-24 md:pb-14">
            <div className="space-y-5 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <span className="size-1.5 rounded-full bg-[color:var(--ochre)]" />
                Planificateur de voyage
              </span>
              <h1 className="font-serif text-balance text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
                Le voyage qui te ressemble,
                <br className="hidden sm:block" />
                <span className="italic">pensé pour ton équipage.</span>
              </h1>
              <p className="mx-auto max-w-xl text-pretty text-sm text-muted-foreground md:text-base">
                Renseigne ton groupe, tes dates et tes envies — on assemble vols,
                hébergement et activités cohérents avec ta réalité.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-4 pb-24">
          <SearchForm />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

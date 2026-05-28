import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 pt-16 pb-8 md:pt-24">
        <div className="space-y-3 text-center">
          <span className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Planificateur de voyage
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Le voyage qui te ressemble, pensé pour ton équipage.
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-sm text-muted-foreground md:text-base">
            Vols, hébergements et activités sur-mesure — selon ton groupe,
            tes goûts et tes contraintes.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-24">
        <SearchForm />
      </section>
    </main>
  );
}

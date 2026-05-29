"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TripPlan } from "@/lib/types";
import { TripPlanDisplay } from "@/components/trip-plan-display";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const STORAGE_KEY = "voyago.trip-plan";

export default function ResultsPage() {
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setPlan(JSON.parse(raw) as TripPlan);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">
          Chargement…
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-3xl space-y-4 px-4 py-20">
          <h1 className="font-serif text-2xl font-medium tracking-tight">
            Aucun voyage en mémoire
          </h1>
          <p className="text-sm text-muted-foreground">
            Lance une recherche depuis la page d&apos;accueil pour composer un voyage.
          </p>
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Retour à l&apos;accueil
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 md:py-16">
        <TripPlanDisplay plan={plan} />
      </main>
      <SiteFooter />
    </div>
  );
}

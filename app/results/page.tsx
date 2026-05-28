"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Itinerary } from "@/lib/types";
import { ItineraryDisplay } from "@/components/itinerary-display";
import { buttonVariants } from "@/components/ui/button";

const STORAGE_KEY = "voyago.itinerary";

export default function ResultsPage() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setItinerary(JSON.parse(raw) as Itinerary);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  if (!itinerary) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 space-y-4">
        <h1 className="text-xl font-semibold">Aucun itinéraire en mémoire</h1>
        <p className="text-sm text-muted-foreground">
          Lance une recherche depuis la page d&apos;accueil pour générer un voyage.
        </p>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <ItineraryDisplay itinerary={itinerary} />
    </main>
  );
}

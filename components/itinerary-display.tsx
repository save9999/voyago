"use client";

import Link from "next/link";
import type { Itinerary } from "@/lib/types";
import { BUDGET_LABELS, TRIP_TYPE_LABELS } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ItineraryDisplay({ itinerary }: { itinerary: Itinerary }) {
  const { profile, overview, days, tips } = itinerary;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Itinéraire IA</span>
          <span>•</span>
          <span>{profile.destination}</span>
          <span>•</span>
          <span>{days.length} jour{days.length > 1 ? "s" : ""}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Voyage à {profile.destination}
        </h1>
        <p className="text-pretty text-muted-foreground">{overview}</p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {profile.tripTypes.map((t) => (
            <span
              key={t}
              className="rounded-full border bg-card px-2.5 py-0.5 text-xs"
            >
              {TRIP_TYPE_LABELS[t]}
            </span>
          ))}
          <span className="rounded-full border bg-card px-2.5 py-0.5 text-xs">
            {BUDGET_LABELS[profile.budget]}
          </span>
          <span className="rounded-full border bg-card px-2.5 py-0.5 text-xs">
            {profile.adults} adulte{profile.adults > 1 ? "s" : ""}
            {profile.children > 0 ? ` · ${profile.children} enfant${profile.children > 1 ? "s" : ""}` : ""}
          </span>
        </div>
      </header>

      <Separator />

      <section className="space-y-4">
        {days.map((day, idx) => (
          <Card key={`${day.date}-${idx}`} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-baseline justify-between gap-3">
                <CardTitle className="text-base">
                  Jour {idx + 1} · {formatDate(day.date)}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{day.summary}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {day.morning && (
                <p>
                  <span className="font-medium text-foreground">Matin · </span>
                  <span className="text-muted-foreground">{day.morning}</span>
                </p>
              )}
              {day.afternoon && (
                <p>
                  <span className="font-medium text-foreground">Après-midi · </span>
                  <span className="text-muted-foreground">{day.afternoon}</span>
                </p>
              )}
              {day.evening && (
                <p>
                  <span className="font-medium text-foreground">Soirée · </span>
                  <span className="text-muted-foreground">{day.evening}</span>
                </p>
              )}
              {day.activities.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  {day.activities.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {tips.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Conseils pratiques</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-4">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Nouvelle recherche
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpRight,
  Plane,
  BedDouble,
  MapPinned,
  Clock,
  ArrowRight as ArrowRightIcon,
} from "lucide-react";
import type { TripPlan, FlightOffer } from "@/lib/types";
import { BUDGET_LABELS, TRIP_TYPE_LABELS } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AIRLINE_NAMES: Record<string, string> = {
  AF: "Air France",
  KL: "KLM",
  LH: "Lufthansa",
  BA: "British Airways",
  IB: "Iberia",
  TP: "TAP Air Portugal",
  TK: "Turkish Airlines",
  EK: "Emirates",
  QR: "Qatar Airways",
  EY: "Etihad Airways",
  U2: "easyJet",
  FR: "Ryanair",
  V7: "Volotea",
  VY: "Vueling",
  AT: "Royal Air Maroc",
  TU: "Tunisair",
};

function airlineName(code: string): string {
  return AIRLINE_NAMES[code] ?? code;
}

function formatDate(iso: string): string {
  return format(new Date(iso), "EEEE d MMMM", { locale: fr });
}

function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
}

function SectionHeader({
  index,
  title,
  description,
  icon: Icon,
}: {
  index: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-10 items-center justify-center rounded-full border bg-card">
        <Icon className="size-4 text-[color:var(--ochre)]" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xs text-[color:var(--ochre)]">
            {index}
          </span>
          <h2 className="font-serif text-2xl font-medium tracking-tight">
            {title}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ExternalCTA({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}

function FlightCard({ offer }: { offer: FlightOffer }) {
  const outbound = offer.trips[0];
  const inbound = offer.trips[1];
  const firstSeg = outbound.segments[0];
  const lastSeg = outbound.segments[outbound.segments.length - 1];

  return (
    <article className="overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <Plane className="size-3.5 text-muted-foreground" />
          <span className="font-medium">
            {offer.airlines.map(airlineName).join(", ")}
          </span>
          {offer.reasons[0] && (
            <span className="hidden text-xs text-muted-foreground md:inline">
              · {offer.reasons[0]}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="font-serif text-lg font-medium tracking-tight">
            {offer.totalPriceEur.toFixed(0)} €
          </div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      </div>

      <div className="space-y-4 p-5 text-sm">
        <TripLeg
          label="Aller"
          from={firstSeg.from}
          to={lastSeg.to}
          departure={firstSeg.departure}
          arrival={lastSeg.arrival}
          durationMinutes={outbound.durationMinutes}
          stops={outbound.segments.length - 1}
        />
        {inbound && (
          <div className="border-t pt-4">
            <TripLeg
              label="Retour"
              from={inbound.segments[0].from}
              to={inbound.segments[inbound.segments.length - 1].to}
              departure={inbound.segments[0].departure}
              arrival={
                inbound.segments[inbound.segments.length - 1].arrival
              }
              durationMinutes={inbound.durationMinutes}
              stops={inbound.segments.length - 1}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function TripLeg({
  label,
  from,
  to,
  departure,
  arrival,
  durationMinutes,
  stops,
}: {
  label: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-left">
          <div className="font-serif text-lg font-medium">
            {formatTime(departure)}
          </div>
          <div className="text-xs text-muted-foreground">{from}</div>
        </div>
        <div className="flex flex-1 flex-col items-center px-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {formatDuration(durationMinutes)}
          </div>
          <div className="my-1 h-px w-full bg-border" />
          <div className="text-xs text-muted-foreground">
            {stops === 0 ? "Direct" : `${stops} escale${stops > 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-lg font-medium">
            {formatTime(arrival)}
          </div>
          <div className="text-xs text-muted-foreground">{to}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {format(new Date(departure), "EEE d MMM", { locale: fr })}
      </div>
    </div>
  );
}

export function TripPlanDisplay({ plan }: { plan: TripPlan }) {
  const { profile, itinerary, flights, hotels, activities } = plan;
  const composition = [
    `${profile.adults} adulte${profile.adults > 1 ? "s" : ""}`,
    profile.children > 0
      ? `${profile.children} enfant${profile.children > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-16">
      <header className="space-y-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Voyago
          </Link>
          <span>/</span>
          <span>Ton voyage</span>
        </div>

        <div className="space-y-4">
          <h1 className="font-serif text-balance text-4xl font-medium tracking-tight md:text-5xl">
            {profile.destination}
            <span className="text-[color:var(--ochre)]">.</span>
          </h1>
          <p className="text-pretty text-muted-foreground md:text-lg">
            {itinerary.overview}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium">
            {format(new Date(profile.startDate), "d MMM", { locale: fr })} →{" "}
            {format(new Date(profile.endDate), "d MMM yyyy", { locale: fr })}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{composition}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {itinerary.days.length} jour{itinerary.days.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
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
        </div>
      </header>

      <section className="space-y-6">
        <SectionHeader
          index="Étape 01"
          title="Les vols"
          description={
            flights.available
              ? `${flights.offers.length} meilleurs vols sélectionnés pour ton équipage.`
              : "Cherche manuellement sur Skyscanner."
          }
          icon={Plane}
        />

        {flights.available && flights.offers.length > 0 ? (
          <>
            <div className="space-y-3">
              {flights.offers.map((offer) => (
                <FlightCard key={offer.id} offer={offer} />
              ))}
            </div>
            <a
              href={flights.fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Voir plus de vols sur Skyscanner
              <ArrowUpRight className="size-3.5" />
            </a>
          </>
        ) : (
          <div className="space-y-3">
            {flights.note && (
              <p className="text-sm text-muted-foreground">{flights.note}</p>
            )}
            <ExternalCTA
              href={flights.fallbackUrl}
              label="Voir les vols sur Skyscanner"
              description={`Paris → ${profile.destination}`}
            />
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeader
          index="Étape 02"
          title="L'hébergement"
          description="Réserve un lieu adapté à ton groupe et ton budget."
          icon={BedDouble}
        />
        <ExternalCTA
          href={hotels.searchUrl}
          label="Voir les hébergements sur Booking"
          description={`${composition}${
            profile.childrenAges.length > 0
              ? ` (âges : ${profile.childrenAges.join(", ")})`
              : ""
          }`}
        />
      </section>

      <section className="space-y-6">
        <SectionHeader
          index="Étape 03"
          title="L'itinéraire jour par jour"
          description="Conçu pour ton groupe, tes goûts et tes contraintes."
          icon={MapPinned}
        />
        <ol className="space-y-3">
          {itinerary.days.map((day, idx) => (
            <li
              key={`${day.date}-${idx}`}
              className="overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-sm"
            >
              <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                <div className="border-b bg-muted/40 p-5 md:border-b-0 md:border-r">
                  <p className="font-serif text-xs uppercase tracking-wider text-[color:var(--ochre)]">
                    Jour {idx + 1}
                  </p>
                  <p className="mt-1 font-serif text-lg leading-tight">
                    {formatDate(day.date)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {day.summary}
                  </p>
                </div>
                <div className="space-y-3 p-5 text-sm">
                  {day.morning && (
                    <p>
                      <span className="font-medium">Matin</span>{" "}
                      <span className="text-muted-foreground">
                        · {day.morning}
                      </span>
                    </p>
                  )}
                  {day.afternoon && (
                    <p>
                      <span className="font-medium">Après-midi</span>{" "}
                      <span className="text-muted-foreground">
                        · {day.afternoon}
                      </span>
                    </p>
                  )}
                  {day.evening && (
                    <p>
                      <span className="font-medium">Soirée</span>{" "}
                      <span className="text-muted-foreground">
                        · {day.evening}
                      </span>
                    </p>
                  )}
                  {day.activities.length > 0 && (
                    <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                      {day.activities.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="pt-2">
          <a
            href={activities.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Réserver les activités sur GetYourGuide
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </section>

      {itinerary.tips.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-[color:var(--ochre)]/30 bg-[color:var(--ochre)]/5 p-6">
          <h2 className="font-serif text-lg font-medium tracking-tight">
            Conseils pratiques
          </h2>
          <ul className="space-y-2 text-sm">
            {itinerary.tips.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-[color:var(--ochre)]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3 pt-4">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          <ArrowRightIcon className="size-4 rotate-180" />
          Nouvelle recherche
        </Link>
      </div>
    </div>
  );
}

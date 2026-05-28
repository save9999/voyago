import { NextResponse } from "next/server";
import { chat, type JsonSchema } from "@/lib/llm";
import { itinerarySchema } from "@/lib/schema";
import {
  searchIataCode,
  searchFlights,
  scoreFlights,
  type RawFlightOffer,
} from "@/lib/duffel";
import {
  buildBookingUrl,
  buildSkyscannerUrl,
  buildGetYourGuideUrl,
} from "@/lib/booking";
import {
  BUDGET_LABELS,
  TRIP_TYPE_LABELS,
  type FlightOffer,
  type FlightTrip,
  type TripPlan,
  type TripProfile,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ORIGIN_IATA = process.env.ORIGIN_IATA || "PAR";

const ITINERARY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    overview: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          summary: { type: "string" },
          morning: { type: "string" },
          afternoon: { type: "string" },
          evening: { type: "string" },
          activities: { type: "array", items: { type: "string" } },
        },
        required: ["date", "summary", "activities"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["overview", "days", "tips"],
};

function buildItineraryPrompt(profile: TripProfile): string {
  const start = new Date(profile.startDate);
  const end = new Date(profile.endDate);
  const nights = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );

  const composition = [
    `${profile.adults} adulte${profile.adults > 1 ? "s" : ""}`,
    profile.children > 0
      ? `${profile.children} enfant${profile.children > 1 ? "s" : ""} (âges : ${profile.childrenAges.join(", ")})`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const types = profile.tripTypes.map((t) => TRIP_TYPE_LABELS[t]).join(", ");

  return `Profil de voyage :
- Destination : ${profile.destination}
- Dates : du ${profile.startDate} au ${profile.endDate} (${nights} nuits)
- Composition : ${composition}
- Thématiques recherchées : ${types}
- Budget : ${BUDGET_LABELS[profile.budget]}
- Préférences supplémentaires : ${profile.preferences?.trim() || "aucune"}

Génère un itinéraire jour par jour adapté à ce profil. Contraintes impératives :
1. Adapte la durée et l'intensité des activités aux âges des enfants (siestes, distances, sécurité).
2. Évite les recommandations bruyantes ou tardives si présence d'enfants < 8 ans.
3. Reste cohérent avec le budget indiqué.
4. Propose des activités locales authentiques, pas seulement touristiques.
5. Prévois des temps calmes et des repas adaptés.

Le tableau "days" doit contenir exactement ${nights + 1} entrées (du ${profile.startDate} au ${profile.endDate} inclus).`;
}

async function generateItinerary(profile: TripProfile) {
  const raw = await chat({
    responseSchema: ITINERARY_SCHEMA,
    temperature: 0.7,
    maxTokens: 32768,
    messages: [
      {
        role: "system",
        content:
          "Tu es un expert en planification de voyages francophones. Tu réponds toujours en français.",
      },
      { role: "user", content: buildItineraryPrompt(profile) },
    ],
  });
  return itinerarySchema.parse(JSON.parse(raw));
}

function parseDurationToMinutes(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

function normalizeOffer(
  offer: RawFlightOffer,
  reasons: string[],
  stops: number,
  totalDurationMinutes: number,
): FlightOffer {
  const trips: FlightTrip[] = offer.itineraries.map((it) => ({
    durationMinutes: parseDurationToMinutes(it.duration),
    segments: it.segments.map((s) => ({
      from: s.departure.iataCode,
      to: s.arrival.iataCode,
      departure: s.departure.at,
      arrival: s.arrival.at,
      carrier: s.carrierCode,
      flightNumber: s.number,
      durationMinutes: parseDurationToMinutes(s.duration),
    })),
  }));

  return {
    id: offer.id,
    totalPriceEur: Number(offer.price.grandTotal ?? offer.price.total),
    stops,
    totalDurationMinutes,
    reasons,
    trips,
    airlines: offer.validatingAirlineCodes,
  };
}

async function fetchFlights(profile: TripProfile) {
  const fallbackUrl = buildSkyscannerUrl(profile, ORIGIN_IATA);

  const hasCreds = !!process.env.DUFFEL_API_TOKEN;
  if (!hasCreds) {
    return {
      available: false,
      offers: [],
      fallbackUrl,
      note: "Configure DUFFEL_API_TOKEN pour activer les vols en direct.",
    };
  }

  try {
    const location = await searchIataCode(profile.destination);
    if (!location) {
      return {
        available: false,
        offers: [],
        fallbackUrl,
        note: `Impossible de résoudre la destination "${profile.destination}" en code IATA.`,
      };
    }

    const youngChildren = profile.childrenAges.filter((a) => a < 12);
    const childAges = profile.childrenAges.filter((a) => a < 12);
    const adultsCombined =
      profile.adults + profile.childrenAges.filter((a) => a >= 12).length;

    const offers = await searchFlights({
      originIata: ORIGIN_IATA,
      destinationIata: location.iataCode,
      departureDate: profile.startDate,
      returnDate: profile.endDate,
      adults: adultsCombined,
      childAges,
      max: 12,
    });

    const scored = scoreFlights(offers, {
      hasYoungChildren: youngChildren.length > 0,
    });

    const top = scored.slice(0, 5).map((s) =>
      normalizeOffer(
        s.offer,
        s.scoreReasons,
        s.stops,
        s.totalDurationMinutes,
      ),
    );

    return {
      available: true,
      originIata: ORIGIN_IATA,
      destinationIata: location.iataCode,
      offers: top,
      fallbackUrl: buildSkyscannerUrl(
        profile,
        ORIGIN_IATA,
        location.iataCode,
      ),
    };
  } catch (error) {
    return {
      available: false,
      offers: [],
      fallbackUrl,
      note:
        error instanceof Error
          ? `Recherche de vols indisponible : ${error.message}`
          : "Recherche de vols indisponible.",
    };
  }
}

export async function POST(request: Request) {
  let profile: TripProfile;
  try {
    profile = (await request.json()) as TripProfile;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!profile?.destination || !profile?.startDate || !profile?.endDate) {
    return NextResponse.json(
      { error: "Profil de voyage incomplet" },
      { status: 400 },
    );
  }

  try {
    const [itinerary, flights] = await Promise.all([
      generateItinerary(profile),
      fetchFlights(profile),
    ]);

    const plan: TripPlan = {
      profile,
      itinerary,
      flights,
      hotels: { searchUrl: buildBookingUrl(profile) },
      activities: { searchUrl: buildGetYourGuideUrl(profile) },
    };

    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[plan-trip] erreur:", message);
    return NextResponse.json(
      { error: "Composition du voyage échouée", details: message },
      { status: 500 },
    );
  }
}

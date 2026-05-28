const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

function authHeaders(): HeadersInit {
  const token = process.env.DUFFEL_API_TOKEN;
  if (!token) {
    throw new Error("DUFFEL_API_TOKEN manquant dans les variables d'environnement");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Duffel-Version": DUFFEL_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export interface IataLocation {
  iataCode: string;
  name: string;
  cityName: string;
  countryCode: string;
  subType: "AIRPORT" | "CITY";
}

interface DuffelPlace {
  type: "airport" | "city";
  name: string;
  iata_code: string | null;
  iata_country_code?: string | null;
  city_name?: string | null;
}

export async function searchIataCode(
  keyword: string,
): Promise<IataLocation | null> {
  const res = await fetch(
    `${DUFFEL_BASE}/places/suggestions?query=${encodeURIComponent(keyword)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { data?: DuffelPlace[] };
  const places = (data.data ?? []).filter((p) => p.iata_code);
  if (places.length === 0) return null;

  // privilégie une ville (regroupe plusieurs aéroports) puis un aéroport
  const cityFirst = [...places].sort((a, b) =>
    a.type === "city" && b.type !== "city"
      ? -1
      : b.type === "city" && a.type !== "city"
        ? 1
        : 0,
  );
  const top = cityFirst[0];
  return {
    iataCode: top.iata_code as string,
    name: top.name,
    cityName: top.city_name ?? top.name,
    countryCode: top.iata_country_code ?? "",
    subType: top.type === "city" ? "CITY" : "AIRPORT",
  };
}

/** Shape normalisée consommée par route.ts (compatible avec l'ancien format). */
export interface RawFlightOffer {
  id: string;
  oneWay: boolean;
  numberOfBookableSeats: number;
  itineraries: {
    duration: string;
    segments: {
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      duration: string;
    }[];
  }[];
  price: { currency: string; total: string; grandTotal?: string };
  validatingAirlineCodes: string[];
}

export interface FlightSearchParams {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  childAges?: number[];
  max?: number;
}

interface DuffelSegment {
  origin: { iata_code: string };
  destination: { iata_code: string };
  departing_at: string;
  arriving_at: string;
  duration?: string | null;
  marketing_carrier?: { iata_code: string | null } | null;
  marketing_carrier_flight_number?: string | null;
}

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  owner?: { iata_code: string | null } | null;
  slices: { segments: DuffelSegment[] }[];
}

/** Formate une durée en minutes vers ISO8601 (PTxHyM), format attendu par le scoring. */
function minutesToIso(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 || h === 0 ? `${m}M` : ""}`;
}

function diffMinutes(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
}

function mapOffer(offer: DuffelOffer): RawFlightOffer {
  const itineraries = offer.slices.map((slice) => {
    const segs = slice.segments;
    const sliceDuration =
      segs.length > 0
        ? diffMinutes(segs[0].departing_at, segs[segs.length - 1].arriving_at)
        : 0;
    return {
      duration: minutesToIso(sliceDuration),
      segments: segs.map((s) => ({
        departure: { iataCode: s.origin.iata_code, at: s.departing_at },
        arrival: { iataCode: s.destination.iata_code, at: s.arriving_at },
        carrierCode: s.marketing_carrier?.iata_code ?? "",
        number: s.marketing_carrier_flight_number ?? "",
        duration: minutesToIso(diffMinutes(s.departing_at, s.arriving_at)),
      })),
    };
  });

  return {
    id: offer.id,
    oneWay: offer.slices.length === 1,
    numberOfBookableSeats: 0,
    itineraries,
    price: {
      currency: offer.total_currency,
      total: offer.total_amount,
      grandTotal: offer.total_amount,
    },
    validatingAirlineCodes: offer.owner?.iata_code ? [offer.owner.iata_code] : [],
  };
}

export async function searchFlights(
  params: FlightSearchParams,
): Promise<RawFlightOffer[]> {
  const slices = [
    {
      origin: params.originIata,
      destination: params.destinationIata,
      departure_date: params.departureDate,
    },
  ];
  if (params.returnDate) {
    slices.push({
      origin: params.destinationIata,
      destination: params.originIata,
      departure_date: params.returnDate,
    });
  }

  const passengers: Array<{ type: "adult" } | { age: number }> = [
    ...Array.from({ length: params.adults }, () => ({ type: "adult" as const })),
    ...(params.childAges ?? []).map((age) => ({ age })),
  ];

  const res = await fetch(
    `${DUFFEL_BASE}/air/offer_requests?return_offers=true`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        data: { slices, passengers, cabin_class: "economy" },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Duffel flight search ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    data?: { offers?: DuffelOffer[] };
  };
  const offers = data.data?.offers ?? [];
  return offers.slice(0, params.max ?? 12).map(mapOffer);
}

function parseDurationToMinutes(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

export interface ScoredFlight {
  offer: RawFlightOffer;
  scoreReasons: string[];
  totalDurationMinutes: number;
  stops: number;
  priceTotal: number;
}

export function scoreFlights(
  offers: RawFlightOffer[],
  options: { hasYoungChildren: boolean },
): ScoredFlight[] {
  return offers
    .map((offer) => {
      const totalDurationMinutes = offer.itineraries.reduce(
        (sum, it) => sum + parseDurationToMinutes(it.duration),
        0,
      );
      const stops = offer.itineraries.reduce(
        (sum, it) => sum + (it.segments.length - 1),
        0,
      );
      const priceTotal = Number(offer.price.grandTotal ?? offer.price.total);

      const reasons: string[] = [];
      let penalty = 0;

      if (options.hasYoungChildren) {
        if (stops === 0) reasons.push("vol direct, idéal avec enfants");
        else penalty += stops * 200;

        const firstDeparture = new Date(
          offer.itineraries[0].segments[0].departure.at,
        );
        const hour = firstDeparture.getHours();
        if (hour < 6 || hour >= 22) {
          reasons.push("horaire de nuit");
          penalty += 150;
        } else if (hour >= 8 && hour <= 18) {
          reasons.push("horaire diurne confortable");
        }
      } else {
        if (stops === 0) reasons.push("vol direct");
        else penalty += stops * 80;
      }

      const score = priceTotal + penalty + totalDurationMinutes * 0.3;

      return {
        offer,
        scoreReasons: reasons,
        totalDurationMinutes,
        stops,
        priceTotal,
        _score: score,
      };
    })
    .sort((a, b) => a._score - b._score)
    .map(({ _score: _, ...rest }) => rest);
}

const AMADEUS_BASE = "https://test.api.amadeus.com";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  const id = process.env.AMADEUS_CLIENT_ID;
  const secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "AMADEUS_CLIENT_ID et AMADEUS_CLIENT_SECRET manquants dans les variables d'environnement",
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Amadeus auth ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface IataLocation {
  iataCode: string;
  name: string;
  cityName: string;
  countryCode: string;
  subType: "AIRPORT" | "CITY";
}

export async function searchIataCode(
  keyword: string,
): Promise<IataLocation | null> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    keyword,
    subType: "CITY,AIRPORT",
    "page[limit]": "5",
    sort: "analytics.travelers.score",
    view: "LIGHT",
  });

  const res = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    data?: Array<{
      iataCode: string;
      name: string;
      subType: string;
      address?: { cityName?: string; countryCode?: string };
    }>;
  };

  const cityFirst = data.data?.sort((a, b) =>
    a.subType === "CITY" && b.subType !== "CITY"
      ? -1
      : b.subType === "CITY" && a.subType !== "CITY"
        ? 1
        : 0,
  );

  const top = cityFirst?.[0];
  if (!top) return null;
  return {
    iataCode: top.iataCode,
    name: top.name,
    cityName: top.address?.cityName ?? top.name,
    countryCode: top.address?.countryCode ?? "",
    subType: top.subType as "AIRPORT" | "CITY",
  };
}

export interface AmadeusFlightOffer {
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
  travelerPricings?: Array<{
    travelerType: string;
    price: { total: string };
  }>;
}

export interface FlightSearchParams {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  max?: number;
  currencyCode?: string;
}

export async function searchFlights(
  params: FlightSearchParams,
): Promise<AmadeusFlightOffer[]> {
  const token = await getAccessToken();
  const qs = new URLSearchParams({
    originLocationCode: params.originIata,
    destinationLocationCode: params.destinationIata,
    departureDate: params.departureDate,
    adults: String(params.adults),
    currencyCode: params.currencyCode ?? "EUR",
    max: String(params.max ?? 10),
    nonStop: "false",
  });
  if (params.returnDate) qs.set("returnDate", params.returnDate);
  if (params.children && params.children > 0)
    qs.set("children", String(params.children));
  if (params.infants && params.infants > 0)
    qs.set("infants", String(params.infants));

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Amadeus flight search ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { data?: AmadeusFlightOffer[] };
  return data.data ?? [];
}

function parseDurationToMinutes(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (Number(m[1] ?? 0)) * 60 + Number(m[2] ?? 0);
}

export interface ScoredFlight {
  offer: AmadeusFlightOffer;
  scoreReasons: string[];
  totalDurationMinutes: number;
  stops: number;
  priceTotal: number;
}

export function scoreFlights(
  offers: AmadeusFlightOffer[],
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

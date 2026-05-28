import { NextResponse } from "next/server";
import { chat, type JsonSchema } from "@/lib/llm";
import { itinerarySchema } from "@/lib/schema";
import {
  BUDGET_LABELS,
  TRIP_TYPE_LABELS,
  type Itinerary,
  type TripProfile,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function buildPrompt(profile: TripProfile): string {
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

  const types = profile.tripTypes
    .map((t) => TRIP_TYPE_LABELS[t])
    .join(", ");

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

Réponds en JSON UNIQUEMENT, au format exact suivant :

{
  "overview": "résumé du voyage en 2-3 phrases",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "summary": "thème de la journée en une ligne",
      "morning": "activité du matin",
      "afternoon": "activité de l'après-midi",
      "evening": "soirée / dîner",
      "activities": ["activité 1", "activité 2"]
    }
  ],
  "tips": ["conseil pratique 1", "conseil pratique 2"]
}

Le tableau "days" doit contenir exactement ${nights + 1} entrées (du ${profile.startDate} au ${profile.endDate} inclus).`;
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
    const raw = await chat({
      responseSchema: ITINERARY_SCHEMA,
      temperature: 0.7,
      maxTokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en planification de voyages francophones. Tu réponds toujours en français.",
        },
        { role: "user", content: buildPrompt(profile) },
      ],
    });

    const parsed = JSON.parse(raw);
    const validated = itinerarySchema.parse(parsed);

    const itinerary: Itinerary = { profile, ...validated };
    return NextResponse.json({ itinerary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[itinerary] erreur:", message);
    return NextResponse.json(
      { error: "Génération de l'itinéraire échouée", details: message },
      { status: 500 },
    );
  }
}

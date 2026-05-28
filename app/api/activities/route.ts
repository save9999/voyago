import { NextResponse } from "next/server";
import type { ActivityResult, TripProfile } from "@/lib/types";

export async function POST(request: Request) {
  const profile = (await request.json()) as TripProfile;

  const stub: ActivityResult[] = [
    {
      id: "stub-activity-1",
      title: "À implémenter",
      category: "decouverte",
      durationMinutes: 120,
      pricePerPerson: 0,
      description: `Activité stub pour ${profile.destination}`,
    },
  ];

  return NextResponse.json({ results: stub, todo: "Brancher une API activités (Viator, GetYourGuide, Musement…)" });
}

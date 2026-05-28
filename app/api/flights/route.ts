import { NextResponse } from "next/server";
import type { FlightResult, TripProfile } from "@/lib/types";

export async function POST(request: Request) {
  const profile = (await request.json()) as TripProfile;

  const stub: FlightResult[] = [
    {
      id: "stub-1",
      airline: "À implémenter",
      from: "Paris CDG",
      to: profile.destination,
      departure: `${profile.startDate}T08:00:00`,
      arrival: `${profile.startDate}T11:30:00`,
      durationMinutes: 210,
      stops: 0,
      pricePerPerson: 0,
      childFriendlyScore: 0,
    },
  ];

  return NextResponse.json({ results: stub, todo: "Brancher une API vols (Amadeus, Duffel, Skyscanner…)" });
}

import { NextResponse } from "next/server";
import type { HotelResult, TripProfile } from "@/lib/types";

export async function POST(request: Request) {
  const profile = (await request.json()) as TripProfile;

  const stub: HotelResult[] = [
    {
      id: "stub-hotel-1",
      name: "À implémenter",
      city: profile.destination,
      rating: 4.5,
      pricePerNight: 0,
      amenities: [],
      familyFriendly: profile.children > 0,
      noiseLevel: "calme",
    },
  ];

  return NextResponse.json({ results: stub, todo: "Brancher une API hôtels (Booking, Hotelbeds, RateHawk…)" });
}

export type TripType =
  | "detente"
  | "aventure"
  | "culturel"
  | "gastronomie"
  | "romantique"
  | "famille"
  | "plage"
  | "nature";

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  detente: "Détente",
  aventure: "Aventure",
  culturel: "Culturel",
  gastronomie: "Gastronomie",
  romantique: "Romantique",
  famille: "Famille",
  plage: "Plage",
  nature: "Nature",
};

export type BudgetTier = "economique" | "moyen" | "premium" | "luxe";

export const BUDGET_LABELS: Record<BudgetTier, string> = {
  economique: "Économique (~ 500 € / pers.)",
  moyen: "Moyen (~ 1 500 € / pers.)",
  premium: "Premium (~ 3 000 € / pers.)",
  luxe: "Luxe (5 000 € + / pers.)",
};

export interface TripProfile {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  childrenAges: number[];
  tripTypes: TripType[];
  budget: BudgetTier;
  preferences?: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
  pricePerPerson: number;
  childFriendlyScore: number;
}

export interface HotelResult {
  id: string;
  name: string;
  city: string;
  rating: number;
  pricePerNight: number;
  amenities: string[];
  familyFriendly: boolean;
  noiseLevel: "calme" | "modere" | "anime";
  imageUrl?: string;
}

export interface ActivityResult {
  id: string;
  title: string;
  category: string;
  durationMinutes: number;
  minAge?: number;
  maxAge?: number;
  pricePerPerson: number;
  description: string;
  imageUrl?: string;
}

export interface ItineraryDay {
  date: string;
  summary: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  activities: string[];
}

export interface Itinerary {
  profile: TripProfile;
  overview: string;
  days: ItineraryDay[];
  tips: string[];
}

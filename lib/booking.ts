import type { TripProfile } from "@/lib/types";

export function buildBookingUrl(profile: TripProfile): string {
  const params = new URLSearchParams({
    ss: profile.destination,
    checkin: profile.startDate,
    checkout: profile.endDate,
    group_adults: String(profile.adults),
    group_children: String(profile.children),
    lang: "fr",
  });
  profile.childrenAges.forEach((age) => params.append("age", String(age)));
  return `https://www.booking.com/searchresults.fr.html?${params.toString()}`;
}

export function buildSkyscannerUrl(
  profile: TripProfile,
  originIata = "PAR",
  destinationIata?: string,
): string {
  if (destinationIata) {
    const dep = profile.startDate.replace(/-/g, "").slice(2);
    const ret = profile.endDate.replace(/-/g, "").slice(2);
    return `https://www.skyscanner.fr/transport/vols/${originIata.toLowerCase()}/${destinationIata.toLowerCase()}/${dep}/${ret}/`;
  }
  return `https://www.skyscanner.fr/transport/vols/${originIata.toLowerCase()}/`;
}

export function buildGetYourGuideUrl(profile: TripProfile): string {
  return `https://www.getyourguide.fr/s/?q=${encodeURIComponent(
    profile.destination,
  )}&searchSource=3`;
}

import { z } from "zod";

export const tripTypeEnum = z.enum([
  "detente",
  "aventure",
  "culturel",
  "gastronomie",
  "romantique",
  "famille",
  "plage",
  "nature",
]);

export const budgetEnum = z.enum(["economique", "moyen", "premium", "luxe"]);

export const searchSchema = z
  .object({
    destination: z
      .string()
      .min(2, "Destination trop courte")
      .max(80, "Destination trop longue"),
    startDate: z.string().min(1, "Date de départ requise"),
    endDate: z.string().min(1, "Date de retour requise"),
    adults: z
      .number({ message: "Nombre d'adultes requis" })
      .int()
      .min(1, "Au moins 1 adulte")
      .max(10, "Maximum 10 adultes"),
    children: z
      .number()
      .int()
      .min(0)
      .max(8, "Maximum 8 enfants"),
    childrenAges: z
      .array(
        z
          .number()
          .int()
          .min(0, "Âge invalide")
          .max(17, "Considéré comme adulte au-delà de 17 ans"),
      )
      .max(8),
    tripTypes: z
      .array(tripTypeEnum)
      .min(1, "Choisis au moins un type de voyage")
      .max(4, "Maximum 4 types"),
    budget: budgetEnum,
    preferences: z.string().max(500).optional(),
  })
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    { message: "La date de retour doit être après le départ", path: ["endDate"] },
  )
  .refine(
    (data) => data.childrenAges.length === data.children,
    { message: "Renseigne l'âge de chaque enfant", path: ["childrenAges"] },
  );

export type SearchInput = z.infer<typeof searchSchema>;

export const itineraryDaySchema = z.object({
  date: z.string(),
  summary: z.string(),
  morning: z.string().optional(),
  afternoon: z.string().optional(),
  evening: z.string().optional(),
  activities: z.array(z.string()),
});

export const itinerarySchema = z.object({
  overview: z.string(),
  days: z.array(itineraryDaySchema).min(1),
  tips: z.array(z.string()),
});

export type ItineraryPayload = z.infer<typeof itinerarySchema>;

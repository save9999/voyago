"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchSchema, type SearchInput } from "@/lib/schema";
import {
  TRIP_TYPE_LABELS,
  BUDGET_LABELS,
  type TripType,
  type BudgetTier,
  type Itinerary,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const TRIP_TYPES = Object.keys(TRIP_TYPE_LABELS) as TripType[];
const BUDGETS = Object.keys(BUDGET_LABELS) as BudgetTier[];

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const STORAGE_KEY = "voyago.itinerary";

export function SearchForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SearchInput>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      destination: "",
      startDate: inDays(14),
      endDate: inDays(21),
      adults: 2,
      children: 0,
      childrenAges: [],
      tripTypes: ["detente"],
      budget: "moyen",
      preferences: "",
    },
  });

  const children = watch("children");
  const childrenAges = watch("childrenAges");
  const tripTypes = watch("tripTypes");

  useEffect(() => {
    const current = childrenAges ?? [];
    if (current.length === children) return;
    const next = Array.from({ length: children }, (_, i) => current[i] ?? 6);
    setValue("childrenAges", next, { shouldValidate: true });
  }, [children, childrenAges, setValue]);

  const toggleTripType = (type: TripType) => {
    const current = new Set(tripTypes ?? []);
    if (current.has(type)) {
      current.delete(type);
    } else {
      if (current.size >= 4) return;
      current.add(type);
    }
    setValue("tripTypes", Array.from(current), { shouldValidate: true });
  };

  const onSubmit = async (data: SearchInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;
        throw new Error(
          payload?.details || payload?.error || `Erreur ${res.status}`,
        );
      }

      const { itinerary } = (await res.json()) as { itinerary: Itinerary };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
      router.push("/results");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full space-y-8 rounded-2xl border bg-card p-6 shadow-sm md:p-8"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            placeholder="Lisbonne, Bali, Marrakech…"
            {...register("destination")}
          />
          {errors.destination && (
            <p className="text-sm text-destructive">{errors.destination.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Aller</Label>
          <Input
            id="startDate"
            type="date"
            min={today()}
            {...register("startDate")}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Retour</Label>
          <Input
            id="endDate"
            type="date"
            min={today()}
            {...register("endDate")}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Controller
            name="budget"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="budget">
                  <SelectValue placeholder="Choisis un budget" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGETS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {BUDGET_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Voyageurs</h3>
          <p className="text-sm text-muted-foreground">
            Précise la composition du groupe pour adapter les recommandations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adults">Adultes</Label>
            <Input
              id="adults"
              type="number"
              min={1}
              max={10}
              {...register("adults", { valueAsNumber: true })}
            />
            {errors.adults && (
              <p className="text-sm text-destructive">{errors.adults.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="children">Enfants (0-17 ans)</Label>
            <Input
              id="children"
              type="number"
              min={0}
              max={8}
              {...register("children", { valueAsNumber: true })}
            />
            {errors.children && (
              <p className="text-sm text-destructive">{errors.children.message}</p>
            )}
          </div>
        </div>

        {children > 0 && (
          <div className="space-y-2">
            <Label>Âge de chaque enfant</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: children }, (_, i) => (
                <div key={i} className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Enfant {i + 1}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={17}
                    {...register(`childrenAges.${i}` as const, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              ))}
            </div>
            {errors.childrenAges && (
              <p className="text-sm text-destructive">
                {errors.childrenAges.message ??
                  "Vérifie l'âge de chaque enfant"}
              </p>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Type de voyage</h3>
          <p className="text-sm text-muted-foreground">
            Choisis jusqu&apos;à 4 thématiques pour orienter l&apos;itinéraire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIP_TYPES.map((type) => {
            const active = tripTypes?.includes(type);
            return (
              <button
                type="button"
                key={type}
                onClick={() => toggleTripType(type)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {TRIP_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
        {errors.tripTypes && (
          <p className="text-sm text-destructive">{errors.tripTypes.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferences">Préférences (optionnel)</Label>
        <Textarea
          id="preferences"
          placeholder="Ex : éviter les vols de nuit, hôtel avec piscine, cuisine locale…"
          rows={3}
          {...register("preferences")}
        />
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Claude planifie ton voyage…"
          : "Générer mon itinéraire"}
      </Button>
    </form>
  );
}

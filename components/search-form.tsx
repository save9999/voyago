"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, ArrowRight } from "lucide-react";
import { searchSchema, type SearchInput } from "@/lib/schema";
import {
  TRIP_TYPE_LABELS,
  BUDGET_LABELS,
  type TripType,
  type BudgetTier,
  type TripPlan,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TRIP_TYPES = Object.keys(TRIP_TYPE_LABELS) as TripType[];
const BUDGETS = Object.keys(BUDGET_LABELS) as BudgetTier[];

const STORAGE_KEY = "voyago.trip-plan";

const inDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <Label className="text-[0.78rem] font-medium uppercase tracking-wider text-muted-foreground">
        {children}
      </Label>
      {hint && (
        <span className="text-xs text-muted-foreground/70">{hint}</span>
      )}
    </div>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-sm text-[color:var(--ochre)]">
        {number}
      </span>
      <div>
        <h3 className="font-serif text-lg font-medium tracking-tight">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

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
  const startDate = watch("startDate");
  const endDate = watch("endDate");

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
      const res = await fetch("/api/plan-trip", {
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

      const { plan } = (await res.json()) as { plan: TripPlan };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      router.push("/results");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="relative w-full overflow-hidden rounded-3xl border bg-card/80 p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_30px_60px_-30px_rgba(0,0,0,0.18)] backdrop-blur md:p-10"
    >
      <div className="space-y-10">
        <div className="space-y-6">
          <SectionHeading
            number="01"
            title="Le voyage"
            description="Où, et quand."
          />

          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <FieldLabel>Destination</FieldLabel>
              <Input
                placeholder="Lisbonne, Bali, Marrakech…"
                className="h-11"
                {...register("destination")}
              />
              {errors.destination && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.destination.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel>Aller</FieldLabel>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <span>
                        {field.value
                          ? format(new Date(field.value), "d MMM yyyy", {
                              locale: fr,
                            })
                          : "Choisir"}
                      </span>
                      <CalendarIcon className="size-4 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto bg-popover p-0"
                    >
                      <Calendar
                        mode="single"
                        locale={fr}
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(d) => d && field.onChange(toISO(d))}
                        disabled={(d) => d < new Date(new Date().toDateString())}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.startDate && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <FieldLabel>Retour</FieldLabel>
              <Controller
                control={control}
                name="endDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        "flex h-11 w-full items-center justify-between rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <span>
                        {field.value
                          ? format(new Date(field.value), "d MMM yyyy", {
                              locale: fr,
                            })
                          : "Choisir"}
                      </span>
                      <CalendarIcon className="size-4 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto bg-popover p-0"
                    >
                      <Calendar
                        mode="single"
                        locale={fr}
                        selected={
                          field.value ? new Date(field.value) : undefined
                        }
                        onSelect={(d) => d && field.onChange(toISO(d))}
                        disabled={(d) =>
                          d < new Date(startDate || new Date().toDateString())
                        }
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.endDate && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {startDate && endDate && (
            <p className="text-xs text-muted-foreground">
              {Math.max(
                1,
                Math.round(
                  (new Date(endDate).getTime() -
                    new Date(startDate).getTime()) /
                    86_400_000,
                ),
              )}{" "}
              nuits sur place
            </p>
          )}
        </div>

        <div className="border-t border-border/70" />

        <div className="space-y-6">
          <SectionHeading
            number="02"
            title="L'équipage"
            description="Qui voyage, et avec qui."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel hint="18 ans et +">Adultes</FieldLabel>
              <Input
                type="number"
                min={1}
                max={10}
                className="h-11"
                {...register("adults", { valueAsNumber: true })}
              />
              {errors.adults && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.adults.message}
                </p>
              )}
            </div>
            <div>
              <FieldLabel hint="0 – 17 ans">Enfants</FieldLabel>
              <Input
                type="number"
                min={0}
                max={8}
                className="h-11"
                {...register("children", { valueAsNumber: true })}
              />
              {errors.children && (
                <p className="mt-1.5 text-sm text-destructive">
                  {errors.children.message}
                </p>
              )}
            </div>
          </div>

          {children > 0 && (
            <div>
              <FieldLabel>Âge de chaque enfant</FieldLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: children }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-background/60 p-3"
                  >
                    <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                      Enfant {i + 1}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={17}
                      className="mt-1 h-9 border-0 bg-transparent p-0 text-base focus-visible:ring-0"
                      {...register(`childrenAges.${i}` as const, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/70" />

        <div className="space-y-6">
          <SectionHeading
            number="03"
            title="L'ambiance"
            description="Le ton du voyage et l'enveloppe budgétaire."
          />

          <div>
            <FieldLabel hint="jusqu'à 4">Types de voyage</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((type) => {
                const active = tripTypes?.includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => toggleTripType(type)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                      active
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {TRIP_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
            {errors.tripTypes && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.tripTypes.message}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>Budget</FieldLabel>
            <Controller
              name="budget"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11">
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

          <div>
            <FieldLabel hint="optionnel">Préférences</FieldLabel>
            <Textarea
              placeholder="Ex : éviter les vols de nuit, hôtel avec piscine, cuisine locale…"
              rows={3}
              {...register("preferences")}
            />
          </div>
        </div>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="group h-12 w-full text-base font-medium"
        >
          {isSubmitting ? (
            "On compose ton voyage…"
          ) : (
            <>
              Composer mon voyage
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

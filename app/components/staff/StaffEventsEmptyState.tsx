import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Flag,
  FlaskConical,
  MapPin,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StaffEventsEmptyKind = "live" | "simulation" | "filtered";

type StaffEventsEmptyStateProps = {
  kind: StaffEventsEmptyKind;
  canCreate?: boolean;
  canCreateSim?: boolean;
  createHref?: string;
  onCreateSimulation?: () => void;
  className?: string;
};

const HINT_ICONS = [Ticket, MapPin, Flag] as const;

export default function StaffEventsEmptyState({
  kind,
  canCreate = false,
  canCreateSim = false,
  createHref = "/staff/events/new",
  onCreateSimulation,
  className,
}: StaffEventsEmptyStateProps) {
  const { t } = useTranslation();
  const isSim = kind === "simulation";
  const isFiltered = kind === "filtered";

  const title = isFiltered
    ? t("staffPortal.events.emptyState.filteredTitle")
    : isSim
      ? t("staffPortal.events.emptyState.simTitle")
      : t("staffPortal.events.emptyState.liveTitle");

  const subtitle = isFiltered
    ? t("staffPortal.events.emptyState.filteredSubtitle")
    : isSim
      ? t("staffPortal.events.emptyState.simSubtitle")
      : t("staffPortal.events.emptyState.liveSubtitle");

  const hintKeys = isSim
    ? (["simHint1", "simHint2", "simHint3"] as const)
    : isFiltered
      ? null
      : (["liveHint1", "liveHint2", "liveHint3"] as const);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl animate-pulse"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />

      <div className="relative px-6 py-12 md:px-10 md:py-16 flex flex-col items-center text-center animate-slide-up">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-md">
          {title}
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed">
          {subtitle}
        </p>

        {hintKeys ? (
          <ul className="mt-8 grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {hintKeys.map((key, i) => {
              const Icon = HINT_ICONS[i] ?? Sparkles;
              return (
                <li
                  key={key}
                  className="rounded-xl border border-border/80 bg-background/70 backdrop-blur-sm p-3.5 flex gap-3"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs md:text-sm text-muted-foreground leading-snug">
                    {t(`staffPortal.events.emptyState.${key}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {isSim && canCreateSim && onCreateSimulation ? (
            <Button size="lg" className="h-12 px-6" onClick={onCreateSimulation}>
              <FlaskConical className="w-4 h-4 mr-2" />
              {t("staffPortal.events.createSimulation")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
          {!isSim && canCreate ? (
            <Button size="lg" className="h-12 px-6" asChild>
              <Link to={createHref}>
                <Sparkles className="w-4 h-4 mr-2" />
                {createHref.includes("/create")
                  ? t("staffPortal.events.createAdmin")
                  : t("staffPortal.events.emptyState.ctaCreate")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          ) : null}
          {!isSim && canCreateSim && onCreateSimulation ? (
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6"
              onClick={onCreateSimulation}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              {t("staffPortal.events.createSimulation")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

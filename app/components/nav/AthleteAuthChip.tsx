import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import NavUserAvatar from "@/components/nav/NavUserAvatar";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

interface AthleteAuthChipProps {
  /** Return path after login (e.g. `/events/slug`) */
  loginFrom?: string;
  className?: string;
  /** Compact for tight event headers */
  compact?: boolean;
}

/** Portal / sign-in control for light surfaces (event chrome, etc.). */
export default function AthleteAuthChip({
  loginFrom,
  className,
  compact = false,
}: AthleteAuthChipProps) {
  const { t } = useTranslation();
  const { token, user, loading } = useAppSelector((s) => s.athleteAuth);
  const isLoggedIn = Boolean(token && user);

  if (token && !user && loading) {
    return (
      <div
        className={cn(
          "h-9 rounded-full animate-pulse bg-muted shrink-0",
          compact ? "w-16" : "w-24",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (isLoggedIn && user) {
    return (
      <Link
        to="/portal"
        title={t("home.myPortal")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-card/90 text-foreground",
          "pl-1 pr-3 py-1 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0",
          "hover:border-primary/45 hover:bg-primary/5 hover:shadow-md transition-all duration-300",
          className,
        )}
      >
        <NavUserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          avatarUrl={user.avatarUrl}
          onLightSurface
        />
        <span className={cn("truncate", compact ? "max-w-[5rem]" : "max-w-[8rem]")}>
          {user.firstName}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/login"
      state={loginFrom ? { from: loginFrom } : undefined}
      className={cn(
        "text-sm font-semibold text-muted-foreground hover:text-primary transition-colors shrink-0",
        className,
      )}
    >
      {t("home.signIn")}
    </Link>
  );
}

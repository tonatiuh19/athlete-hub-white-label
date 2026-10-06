import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type AtleitaWordmarkProps = {
  href?: string;
  className?: string;
  /** Accessible label for the home link */
  label?: string;
};

/** Text wordmark for Atleita. */
export default function AtleitaWordmark({
  href = "/",
  className,
  label = "Atleita",
}: AtleitaWordmarkProps) {
  return (
    <Link
      to={href}
      aria-label={label}
      className={cn(
        "inline-flex items-center font-extrabold tracking-tight text-foreground",
        "text-[1.35rem] sm:text-[1.5rem] leading-none",
        className,
      )}
    >
      atleita<span className="text-primary">.</span>
    </Link>
  );
}

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavUserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  onLightSurface?: boolean;
  className?: string;
}

export default function NavUserAvatar({
  firstName,
  lastName,
  avatarUrl,
  onLightSurface = true,
  className,
}: NavUserAvatarProps) {
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  const hasAvatar = Boolean(avatarUrl?.trim());

  const avatarShell = cn(
    "h-8 w-8 shrink-0 rounded-full ring-2",
    onLightSurface
      ? "ring-primary/30 ring-offset-2 ring-offset-background"
      : "ring-white/25 ring-offset-2 ring-offset-transparent shadow-md",
    className,
  );

  if (hasAvatar) {
    return (
      <Avatar className={avatarShell}>
        <AvatarImage src={avatarUrl} alt="" />
        <AvatarFallback
          delayMs={0}
          className="bg-atleita-gradient text-primary-foreground text-[11px] font-bold"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div
      className={cn(
        avatarShell,
        "flex items-center justify-center bg-atleita-gradient text-primary-foreground text-[11px] font-bold tracking-tight",
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

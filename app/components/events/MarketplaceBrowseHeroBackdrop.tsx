/** Light evergreen/citron hero backdrop for `/events` — matches home brand wash. */
export default function MarketplaceBrowseHeroBackdrop({
  isDark: _isDark,
}: {
  /** @deprecated Atleita is light-only; ignored. */
  isDark?: boolean;
}) {
  return (
    <>
      <div className="absolute inset-0 md:hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,hsl(var(--primary)/0.16),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_25%,hsl(var(--accent)/0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.5)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="hidden md:block absolute inset-0 bg-secondary/40" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_60%)]" />
      </div>
    </>
  );
}

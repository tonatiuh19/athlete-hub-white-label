import { useEffect, useMemo, useState } from "react";
import { AlarmClock, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventMediaAsset } from "@shared/api";
import { cn } from "@/lib/utils";
import { buildEventMediaSrcSet, optimizeEventMediaUrl } from "@/lib/cdn-url";
import { resolveAbsoluteUrl } from "@/lib/siteMeta";

interface EventDetailHeroGalleryProps {
  title: string;
  bannerUrl?: string | null;
  heroUrl?: string | null;
  media?: EventMediaAsset[] | null;
  showLimitedSlots?: boolean;
  className?: string;
}

function isVideo(asset: EventMediaAsset) {
  const t = asset.asset_type?.toLowerCase() ?? "";
  return t.includes("video") || asset.mime_type?.startsWith("video/");
}

type Slide = {
  key: string;
  url: string;
  srcSet?: string;
  sizes?: string;
  kind: "banner" | "hero" | "media";
};

export default function EventDetailHeroGallery({
  title,
  bannerUrl,
  heroUrl,
  media,
  showLimitedSlots = false,
  className,
}: EventDetailHeroGalleryProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo(() => {
    const out: Slide[] = [];
    const banner = bannerUrl ? optimizeEventMediaUrl(bannerUrl, "banner") : null;
    const hero = heroUrl ? optimizeEventMediaUrl(heroUrl, "detail") : null;
    if (banner) {
      out.push({
        key: "banner",
        url: banner,
        srcSet: buildEventMediaSrcSet(bannerUrl!, "banner"),
        sizes: "(max-width: 1024px) 100vw, 66vw",
        kind: "banner",
      });
    } else if (hero) {
      out.push({
        key: "hero",
        url: hero,
        srcSet: buildEventMediaSrcSet(heroUrl!, "detail"),
        sizes: "(max-width: 1024px) 100vw, 66vw",
        kind: "hero",
      });
    }
    const sorted = [...(media ?? [])]
      .filter((m) => !isVideo(m))
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const item of sorted) {
      const url = resolveAbsoluteUrl(item.url);
      if (!url) continue;
      if (out.some((s) => s.url === url)) continue;
      out.push({
        key: `media-${item.url}-${item.sort_order}`,
        url,
        kind: "media",
      });
    }
    return out;
  }, [bannerUrl, heroUrl, media]);

  useEffect(() => {
    setIndex(0);
  }, [slides.length, bannerUrl, heroUrl]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const current = slides[index] ?? null;
  const total = slides.length;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-muted/40 aspect-[16/10] sm:aspect-[21/10]",
        className,
      )}
    >
      {current ? (
        <img
          key={current.key}
          src={current.url}
          srcSet={current.srcSet}
          sizes={current.sizes}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-500"
          {...({ fetchpriority: index === 0 ? "high" : "auto" } as React.ImgHTMLAttributes<HTMLImageElement>)}
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-accent/20" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

      {showLimitedSlots ? (
        <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
          <AlarmClock className="h-3.5 w-3.5 text-primary" />
          {t("eventDetail.limitedSlots")}
        </div>
      ) : null}

      {total > 1 ? (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur-md border border-border text-foreground hover:bg-background transition-colors"
            aria-label={t("eventDetail.galleryPrev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground tabular-nums"
            aria-label={paused ? t("eventDetail.galleryPlay") : t("eventDetail.galleryPause")}
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {index + 1}/{total}
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % total)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur-md border border-border text-foreground hover:bg-background transition-colors"
            aria-label={t("eventDetail.galleryNext")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

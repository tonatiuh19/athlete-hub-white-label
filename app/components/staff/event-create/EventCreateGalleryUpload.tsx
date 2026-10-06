import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Images, Loader2, Plus, Trash2, Upload } from "lucide-react";
import EventImageCropDialog from "@/components/staff/EventImageCropDialog";
import { Button } from "@/components/ui/button";
import {
  EVENT_IMAGE_RECOMMENDED_DIMENSIONS,
} from "@/constants/eventImageContexts";
import { createBlobPreviewUrl, revokeBlobUrl } from "@/lib/pendingMediaImages";
import type { EventCreateGalleryItem } from "@/utils/eventCreateGallery";
import { validateEventAssetFile } from "@/utils/eventAssetValidation";
import { cn } from "@/lib/utils";

const MAX_GALLERY_IMAGES = 12;

export interface EventCreateGalleryUploadProps {
  items: EventCreateGalleryItem[];
  onChange: (items: EventCreateGalleryItem[]) => void;
  className?: string;
}

export default function EventCreateGalleryUpload({
  items,
  onChange,
  className,
}: EventCreateGalleryUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [staging, setStaging] = useState(false);

  const pendingTotal = items.length + (cropOpen && cropFile ? 1 : 0) + cropQueue.length;
  const activeCropRole = pendingTotal <= 1 ? "hero" : "gallery";
  const recommendedSpec =
    EVENT_IMAGE_RECOMMENDED_DIMENSIONS[activeCropRole === "hero" ? "hero" : "gallery"];

  const revokeItemPreview = (item: EventCreateGalleryItem) => {
    if (item.previewUrl.startsWith("blob:")) {
      revokeBlobUrl(item.previewUrl);
    }
  };

  const removeItem = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    const removed = items.find((item) => item.id === id);
    if (removed) revokeItemPreview(removed);
    onChange(next);
  };

  const appendCroppedFile = (file: File) => {
    const previewUrl = createBlobPreviewUrl(file);
    if (!previewUrl) return;
    onChange([
      ...items,
      {
        id: `local-${crypto.randomUUID()}`,
        previewUrl,
        file,
      },
    ]);
  };

  const processNextCrop = useCallback((queue: File[]) => {
    if (queue.length === 0) {
      setCropFile(null);
      setCropOpen(false);
      return;
    }
    const [next, ...rest] = queue;
    setCropQueue(rest);
    setCropFile(next);
    setCropOpen(true);
  }, []);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError(null);

    const remaining = MAX_GALLERY_IMAGES - items.length;
    if (remaining <= 0) {
      setError(t("staffPortal.eventCreate.wizardSteps.customize.galleryMax", { max: MAX_GALLERY_IMAGES }));
      return;
    }

    const accepted: File[] = [];
    for (const file of Array.from(fileList).slice(0, remaining)) {
      const validationError = validateEventAssetFile(file, "image", t);
      if (validationError) {
        setError(validationError);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    setStaging(true);
    try {
      setCropQueue(accepted.slice(1));
      setCropFile(accepted[0]);
      setCropOpen(true);
    } finally {
      setStaging(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleCropConfirm = (file: File) => {
    appendCroppedFile(file);
    processNextCrop(cropQueue);
  };

  const handleCropOpenChange = (open: boolean) => {
    if (!open) {
      setCropOpen(false);
      setCropFile(null);
      setCropQueue([]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("staffPortal.eventCreate.wizardSteps.customize.galleryBehavior")}
      </p>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={staging}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-8",
            "flex flex-col items-center justify-center gap-2 text-center transition-colors",
            "hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {staging ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {t("staffPortal.eventCreate.wizardSteps.customize.galleryUpload")}
          </span>
          <span className="text-xs text-muted-foreground max-w-xs">
            {t("staffPortal.eventCreate.wizardSteps.customize.galleryUploadHint", {
              max: MAX_GALLERY_IMAGES,
              width: recommendedSpec.width,
              height: recommendedSpec.height,
            })}
          </span>
        </button>
      ) : items.length === 1 ? (
        <div className="relative overflow-hidden rounded-xl border border-border aspect-[16/10] bg-muted/30">
          <img
            src={items[0].previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary border border-primary/20">
            {t("staffPortal.eventCreate.wizardSteps.customize.coverBadge")}
          </div>
          <div className="absolute top-3 right-3 flex gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/90 backdrop-blur"
              onClick={() => inputRef.current?.click()}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-background/90 backdrop-blur text-destructive hover:text-destructive"
              onClick={() => removeItem(items[0].id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Images className="h-4 w-4" />
            {t("staffPortal.eventCreate.wizardSteps.customize.galleryModeLabel", {
              count: items.length,
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted/30 group"
              >
                <img
                  src={item.previewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {index === 0 ? (
                  <span className="absolute top-1.5 left-1.5 rounded-md bg-background/90 backdrop-blur px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground border border-border">
                    {t("staffPortal.eventCreate.wizardSteps.customize.listingThumb")}
                  </span>
                ) : null}
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-background/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium tabular-nums border border-border">
                  {index + 1}/{items.length}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-background/90 backdrop-blur text-destructive hover:text-destructive transition-opacity"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {items.length < MAX_GALLERY_IMAGES ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[10px] font-medium px-1 text-center">
                  {t("staffPortal.eventCreate.wizardSteps.customize.galleryAddMore")}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {items.length === 1 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => inputRef.current?.click()}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("staffPortal.eventCreate.wizardSteps.customize.galleryAddForCarousel")}
        </Button>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(e) => void handleFilesSelected(e.target.files)}
      />

      <EventImageCropDialog
        open={cropOpen}
        file={cropFile}
        role={activeCropRole}
        onOpenChange={handleCropOpenChange}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

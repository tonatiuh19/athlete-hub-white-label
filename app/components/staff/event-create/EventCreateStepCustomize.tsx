import { useTranslation } from "react-i18next";
import { ImageIcon, Type } from "lucide-react";
import EventCreateGalleryUpload from "@/components/staff/event-create/EventCreateGalleryUpload";
import { EventCreateSkipBlock } from "@/components/staff/event-create/EventCreateWizardLayout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventCreateGalleryItem } from "@/utils/eventCreateGallery";
import { cn } from "@/lib/utils";

export type CustomizeBlockId = "hero" | "shortDescription";

export interface EventCreateStepCustomizeProps {
  eventId: number;
  shortDescription: string;
  onShortDescriptionChange: (value: string) => void;
  galleryItems: EventCreateGalleryItem[];
  onGalleryItemsChange: (items: EventCreateGalleryItem[]) => void;
  skippedBlocks: Set<CustomizeBlockId>;
  onSkipBlock: (id: CustomizeBlockId) => void;
}

export default function EventCreateStepCustomize({
  shortDescription,
  onShortDescriptionChange,
  galleryItems,
  onGalleryItemsChange,
  skippedBlocks,
  onSkipBlock,
}: EventCreateStepCustomizeProps) {
  const { t } = useTranslation();

  const blockClass = (id: CustomizeBlockId) =>
    cn(
      "rounded-xl border p-4 space-y-3 transition-opacity",
      skippedBlocks.has(id) ? "border-border/60 bg-muted/20 opacity-60" : "border-border bg-card/50",
    );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">
          {t("staffPortal.eventCreate.wizardSteps.customize.formTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("staffPortal.eventCreate.wizardSteps.customize.formHint")}
        </p>
      </div>

      <section className={blockClass("hero")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t("staffPortal.eventCreate.wizardSteps.customize.heroTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("staffPortal.eventCreate.wizardSteps.customize.heroHint")}
              </p>
            </div>
          </div>
          <EventCreateSkipBlock onSkip={() => onSkipBlock("hero")} />
        </div>
        {!skippedBlocks.has("hero") ? (
          <EventCreateGalleryUpload
            items={galleryItems}
            onChange={onGalleryItemsChange}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventCreate.skippedBlock")}
          </p>
        )}
      </section>

      <section className={blockClass("shortDescription")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Type className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {t("staffPortal.eventCreate.wizardSteps.customize.shortDescTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("staffPortal.eventCreate.wizardSteps.customize.shortDescHint")}
              </p>
            </div>
          </div>
          <EventCreateSkipBlock onSkip={() => onSkipBlock("shortDescription")} />
        </div>
        {!skippedBlocks.has("shortDescription") ? (
          <div className="space-y-1.5">
            <Label htmlFor="wizard-short-desc" className="sr-only">
              {t("staffPortal.eventCreate.wizardSteps.customize.shortDescTitle")}
            </Label>
            <Textarea
              id="wizard-short-desc"
              rows={4}
              value={shortDescription}
              onChange={(e) => onShortDescriptionChange(e.target.value)}
              placeholder={t("staffPortal.eventCreate.wizardSteps.customize.shortDescPlaceholder")}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("staffPortal.eventCreate.skippedBlock")}
          </p>
        )}
      </section>

      <p className="text-xs text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">
        {t("staffPortal.eventCreate.wizardSteps.customize.advancedHint")}
      </p>
    </div>
  );
}

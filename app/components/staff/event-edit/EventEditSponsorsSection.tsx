import type { MutableRefObject } from "react";
import { useFormik, getIn } from "formik";
import { useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import EventAssetUpload from "@/components/staff/EventAssetUpload";
import {
  DraftListRow,
  SectionShell,
} from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import {
  sponsorsFormSchema,
  type SponsorsFormValues,
} from "@/utils/eventEditDraftSchemas";
import { stableJson } from "@/utils/eventEditUnsavedState";
import type { EventSponsorInput, SponsorTier } from "@shared/api";

export type EventEditSponsorsTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditSponsorsSectionProps {
  initialSponsors: EventSponsorInput[];
  sponsorPendingRef: MutableRefObject<Map<number, File>>;
  sponsorsError: string | null;
  savingSponsors: boolean;
  uploadingAssets: boolean;
  isAdmin: boolean;
  onSave: (sponsors: EventSponsorInput[]) => void | Promise<void>;
  createBlobPreviewUrl: (file: File) => string;
  t: EventEditSponsorsTranslate;
  onDirtyChange?: (dirty: boolean) => void;
}

function fieldError(
  t: EventEditSponsorsTranslate,
  errors: unknown,
  path: string,
  submitCount: number,
): string | null {
  if (submitCount < 1) return null;
  const msg = getIn(errors, path);
  return typeof msg === "string" ? t(msg) : null;
}

export default function EventEditSponsorsSection({
  initialSponsors,
  sponsorPendingRef,
  sponsorsError,
  savingSponsors,
  uploadingAssets,
  isAdmin,
  onSave,
  createBlobPreviewUrl,
  t,
  onDirtyChange,
}: EventEditSponsorsSectionProps) {
  const [pendingUploadTick, setPendingUploadTick] = useState(0);
  const bumpPendingUploads = () => setPendingUploadTick((n) => n + 1);

  const formik = useFormik<SponsorsFormValues>({
    initialValues: { sponsors: initialSponsors },
    enableReinitialize: true,
    validationSchema: sponsorsFormSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values, helpers) => {
      await onSave(values.sponsors as EventSponsorInput[]);
      helpers.resetForm({ values: { sponsors: values.sponsors } });
    },
  });

  const sponsors = formik.values.sponsors as EventSponsorInput[];

  const sponsorsDirty = useMemo(
    () =>
      stableJson(sponsors) !== stableJson(initialSponsors) ||
      sponsorPendingRef.current.size > 0,
    [sponsors, initialSponsors, sponsorPendingRef, pendingUploadTick],
  );

  useFormikDirtyReport(sponsorsDirty, onDirtyChange);

  const setSponsors = (next: EventSponsorInput[]) => {
    void formik.setFieldValue("sponsors", next);
  };

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.sponsorsTitle")}
      hint={t("staffPortal.eventEdit.sponsorsHelp")}
    >
      {sponsorsError ? (
        <p className="text-xs text-destructive">{sponsorsError}</p>
      ) : null}

      <div className="space-y-2">
        {sponsors.map((s, i) => {
          const nameErr = fieldError(
            t,
            formik.errors,
            `sponsors.${i}.name`,
            formik.submitCount,
          );
          const websiteErr = fieldError(
            t,
            formik.errors,
            `sponsors.${i}.website_url`,
            formik.submitCount,
          );
          return (
            <div key={i} className="space-y-1">
              <DraftListRow
                className="sm:items-start"
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() =>
                      setSponsors(sponsors.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                }
              >
                <Input
                  className="sm:col-span-4"
                  placeholder={t("staffPortal.eventEdit.sponsorName")}
                  value={s.name}
                  onChange={(e) => {
                    const next = [...sponsors];
                    next[i] = { ...next[i], name: e.target.value };
                    setSponsors(next);
                  }}
                />
                <Input
                  className="sm:col-span-3"
                  placeholder={t("staffPortal.eventEdit.sponsorLogo")}
                  value={s.logo_url ?? ""}
                  onChange={(e) => {
                    const next = [...sponsors];
                    next[i] = { ...next[i], logo_url: e.target.value };
                    setSponsors(next);
                  }}
                />
                <Select
                  value={s.tier ?? "partner"}
                  onValueChange={(v) => {
                    const next = [...sponsors];
                    next[i] = { ...next[i], tier: v as SponsorTier };
                    setSponsors(next);
                  }}
                >
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["title", "gold", "silver", "bronze", "partner"] as SponsorTier[]
                    ).map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {t(`staffPortal.eventEdit.sponsorTier.${tier}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="sm:col-span-12">
                  <EventAssetUpload
                    kind="image"
                    imageRole="sponsor"
                    staffIsAdmin={isAdmin}
                    compact
                    previewUrl={s.logo_url ?? null}
                    onSelectFile={(file) => {
                      sponsorPendingRef.current.set(i, file);
                      const preview = createBlobPreviewUrl(file);
                      const next = [...sponsors];
                      next[i] = { ...next[i], logo_url: preview };
                      setSponsors(next);
                      bumpPendingUploads();
                    }}
                    onClear={() => {
                      sponsorPendingRef.current.delete(i);
                      const next = [...sponsors];
                      next[i] = { ...next[i], logo_url: "" };
                      setSponsors(next);
                      bumpPendingUploads();
                    }}
                  />
                </div>
              </DraftListRow>
              {(nameErr || websiteErr) && (
                <div className="flex flex-wrap gap-x-3 px-0.5">
                  {nameErr ? (
                    <p className="text-[11px] text-destructive">{nameErr}</p>
                  ) : null}
                  {websiteErr ? (
                    <p className="text-[11px] text-destructive">{websiteErr}</p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setSponsors([
              ...sponsors,
              { name: "", tier: "partner", sort_order: sponsors.length },
            ])
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t("staffPortal.eventEdit.addSponsor")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void formik.submitForm()}
          disabled={savingSponsors || uploadingAssets}
        >
          {savingSponsors ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("staffPortal.eventEdit.saveSponsors")}
        </Button>
      </div>
    </SectionShell>
  );
}

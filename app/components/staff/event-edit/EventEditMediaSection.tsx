import type { MutableRefObject } from "react";
import { useFormik, getIn } from "formik";
import { useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import EventAssetUpload from "@/components/staff/EventAssetUpload";
import {
  DraftListRow,
  SectionShell,
} from "@/components/staff/event-edit/primitives";
import { StaffFormSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import { resolveEventImageRole } from "@/constants/eventImageContexts";
import {
  mediaItemsFormSchema,
  type MediaItemsFormValues,
} from "@/utils/eventEditDraftSchemas";
import { stableJson } from "@/utils/eventEditUnsavedState";
import type { StaffMediaAssetRow } from "@shared/api";

export type EventEditMediaTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditMediaSectionProps {
  initialMedia: StaffMediaAssetRow[];
  mediaPendingRef: MutableRefObject<Map<number, File>>;
  eventMediaError: string | null;
  loadingEventMedia: boolean;
  savingEventMedia: boolean;
  uploadingAssets: boolean;
  isAdmin: boolean;
  eventId: number | null | undefined;
  onSave: (media: StaffMediaAssetRow[]) => void | Promise<void>;
  createBlobPreviewUrl: (file: File) => string;
  revokeBlobUrl: (url: string) => void;
  t: EventEditMediaTranslate;
  onDirtyChange?: (dirty: boolean) => void;
}

function fieldError(
  t: EventEditMediaTranslate,
  errors: unknown,
  path: string,
  submitCount: number,
): string | null {
  if (submitCount < 1) return null;
  const msg = getIn(errors, path);
  return typeof msg === "string" ? t(msg) : null;
}

export default function EventEditMediaSection({
  initialMedia,
  mediaPendingRef,
  eventMediaError,
  loadingEventMedia,
  savingEventMedia,
  uploadingAssets,
  isAdmin,
  eventId,
  onSave,
  createBlobPreviewUrl,
  revokeBlobUrl,
  t,
  onDirtyChange,
}: EventEditMediaSectionProps) {
  const [pendingUploadTick, setPendingUploadTick] = useState(0);
  const bumpPendingUploads = () => setPendingUploadTick((n) => n + 1);

  const formik = useFormik<MediaItemsFormValues>({
    initialValues: { media: initialMedia },
    enableReinitialize: true,
    validationSchema: mediaItemsFormSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values, helpers) => {
      await onSave(values.media as StaffMediaAssetRow[]);
      helpers.resetForm({ values: { media: values.media } });
    },
  });

  const media = formik.values.media as StaffMediaAssetRow[];

  const mediaDirty = useMemo(
    () =>
      stableJson(media) !== stableJson(initialMedia) ||
      mediaPendingRef.current.size > 0,
    [media, initialMedia, mediaPendingRef, pendingUploadTick],
  );

  useFormikDirtyReport(mediaDirty, onDirtyChange);

  const setMedia = (next: StaffMediaAssetRow[]) => {
    void formik.setFieldValue("media", next);
  };

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.mediaTitle")}
      hint={t("staffPortal.eventEdit.mediaSubtitle")}
    >
      {eventMediaError ? (
        <p className="text-xs text-destructive">{eventMediaError}</p>
      ) : null}

      {loadingEventMedia ? (
        <StaffFormSkeleton fields={4} />
      ) : (
        <div className="space-y-2">
          {media.map((m, i) => {
            const sortErr = fieldError(
              t,
              formik.errors,
              `media.${i}.sort_order`,
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
                        setMedia(media.filter((_, idx) => idx !== i))
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  }
                >
                  <Input
                    className="sm:col-span-3"
                    placeholder={t("staffPortal.eventEdit.mediaType")}
                    value={m.asset_type}
                    onChange={(e) => {
                      const next = [...media];
                      next[i] = { ...next[i], asset_type: e.target.value };
                      setMedia(next);
                    }}
                  />
                  <div className="sm:col-span-8 space-y-2">
                    <Input
                      placeholder="https://..."
                      value={m.url.startsWith("blob:") ? "" : m.url}
                      onChange={(e) => {
                        const next = [...media];
                        next[i] = { ...next[i], url: e.target.value };
                        setMedia(next);
                      }}
                    />
                    <EventAssetUpload
                      kind="image"
                      imageRole={resolveEventImageRole(m.asset_type)}
                      staffIsAdmin={isAdmin}
                      compact
                      previewUrl={
                        m.url.startsWith("blob:") || m.url.startsWith("http")
                          ? m.url
                          : null
                      }
                      onSelectFile={(file) => {
                        mediaPendingRef.current.set(i, file);
                        const blob = createBlobPreviewUrl(file);
                        const next = [...media];
                        next[i] = { ...next[i], url: blob ?? "" };
                        setMedia(next);
                        bumpPendingUploads();
                      }}
                      onClear={() => {
                        mediaPendingRef.current.delete(i);
                        const next = [...media];
                        if (next[i]?.url.startsWith("blob:")) {
                          revokeBlobUrl(next[i].url);
                        }
                        next[i] = { ...next[i], url: "" };
                        setMedia(next);
                        bumpPendingUploads();
                      }}
                    />
                  </div>
                </DraftListRow>
                {sortErr ? (
                  <p className="text-[11px] text-destructive px-0.5">{sortErr}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setMedia([
              ...media,
              {
                asset_type: "gallery",
                url: "",
                sort_order: media.length,
              },
            ])
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t("staffPortal.eventEdit.addMedia")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={savingEventMedia || uploadingAssets || !eventId}
          onClick={() => void formik.submitForm()}
        >
          {savingEventMedia ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("staffPortal.eventEdit.saveMedia")}
        </Button>
      </div>
    </SectionShell>
  );
}

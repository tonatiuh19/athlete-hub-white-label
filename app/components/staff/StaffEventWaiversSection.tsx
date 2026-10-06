import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import RichHtmlEditor from "@/components/editor/RichHtmlEditor";
import WizardWaiverStep from "@/components/events/registration/WizardWaiverStep";
import EventAssetUpload from "@/components/staff/EventAssetUpload";
import { FieldRow, SectionShell } from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { uploadEventAssetToCdn } from "@/lib/cdn-upload";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateEventWaivers } from "@/store/slices/staffPortalSlice";
import type { EventWaiverInput, EventWaiverPublic, EventWaiverRow, StaffRole } from "@shared/api";
import {
  selectApplicableWaivers,
  type WaiverAudience,
} from "@shared/waiverAudience";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";
import { logger } from "@/utils/logger";
import {
  areWaiverDraftsEqual,
  isActiveEventWaiver,
} from "@/utils/eventEditUnsavedState";

type WaiverDraft = EventWaiverInput & { _key: string };

type WaiverCategoryOption = { id: number; name: string };

const EMPTY_WAIVER = (): WaiverDraft => ({
  _key: crypto.randomUUID(),
  title: "",
  content_html: "",
  pdf_url: null,
  content_type: "html",
  audience: "all",
  category_ids: null,
  sort_order: 0,
});

function rowToDraft(w: EventWaiverRow, index: number): WaiverDraft {
  return {
    _key: `existing-${w.id}`,
    id: w.id,
    title: w.title,
    content_html: w.content_html ?? "",
    pdf_url: w.pdf_url ?? null,
    content_type: w.content_type ?? "html",
    audience: w.audience ?? "all",
    category_ids: w.category_ids?.length ? [...w.category_ids] : null,
    sort_order: Number(w.sort_order) || index,
  };
}

function activeWaiverDrafts(rows: EventWaiverRow[]): WaiverDraft[] {
  return rows.filter(isActiveEventWaiver).map(rowToDraft);
}

function isDraftValid(d: WaiverDraft): boolean {
  if (!d.title.trim()) return false;
  const type = d.content_type ?? "html";
  if (type === "html") return Boolean(d.content_html?.trim());
  if (type === "pdf") return Boolean(d.pdf_url?.trim());
  return Boolean(d.content_html?.trim() || d.pdf_url?.trim());
}

function revokeIfBlobUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

function draftToPublic(
  d: WaiverDraft,
  index: number,
  saved: EventWaiverRow[],
): EventWaiverPublic {
  const savedRow = d.id != null ? saved.find((w) => w.id === d.id) : undefined;
  return {
    id: d.id ?? -(index + 1),
    title: d.title.trim(),
    content_html: d.content_html ?? "",
    pdf_url: d.pdf_url?.trim() ? d.pdf_url : null,
    content_type: d.content_type ?? "html",
    audience: d.audience ?? "all",
    category_ids: d.category_ids?.length ? d.category_ids : null,
    version: savedRow?.version ?? 1,
    sort_order: Number(d.sort_order) || index,
  };
}

export interface StaffEventWaiversSectionProps {
  eventId: number;
  waivers: EventWaiverRow[];
  canManage: boolean;
  staffRole: StaffRole;
  isAdmin: boolean;
  /** Ticket types for optional category targeting (empty selection = all). */
  categories?: WaiverCategoryOption[];
  onDirtyChange?: (dirty: boolean) => void;
}

export default function StaffEventWaiversSection({
  eventId,
  waivers,
  canManage,
  staffRole,
  isAdmin,
  categories = [],
  onDirtyChange,
}: StaffEventWaiversSectionProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { savingWaiver, waiverError } = useAppSelector((s) => s.staffPortal);
  const pdfPendingRef = useRef<Map<string, File>>(new Map());

  const [drafts, setDrafts] = useState<WaiverDraft[]>(() => activeWaiverDrafts(waivers));
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingPdfTick, setPendingPdfTick] = useState(0);
  const bumpPendingPdf = () => setPendingPdfTick((n) => n + 1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsMinor, setPreviewAsMinor] = useState(false);
  const [previewCategoryId, setPreviewCategoryId] = useState<number | "all">(
    "all",
  );
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    return () => {
      for (const d of draftsRef.current) revokeIfBlobUrl(d.pdf_url);
    };
  }, []);

  useEffect(() => {
    for (const d of draftsRef.current) revokeIfBlobUrl(d.pdf_url);
    setDrafts(activeWaiverDrafts(waivers));
    pdfPendingRef.current.clear();
    setHydrated(true);
  }, [waivers]);

  const savedDrafts = useMemo(() => activeWaiverDrafts(waivers), [waivers]);

  const waiversDirty = useMemo(() => {
    if (!hydrated) return false;
    return (
      !areWaiverDraftsEqual(drafts, savedDrafts) || pdfPendingRef.current.size > 0
    );
  }, [drafts, savedDrafts, pendingPdfTick, hydrated]);

  useFormikDirtyReport(waiversDirty, onDirtyChange);

  const previewableDrafts = useMemo(
    () => drafts.filter(isDraftValid),
    [drafts],
  );

  const previewWaivers = useMemo(() => {
    const asPublic = previewableDrafts.map((d, i) =>
      draftToPublic(d, i, waivers),
    );
    const categoryId =
      previewCategoryId === "all"
        ? categories[0]?.id ?? 0
        : previewCategoryId;
    // categoryId 0 + empty category_ids still matches "all categories" waivers.
    return selectApplicableWaivers(asPublic, {
      isMinor: previewAsMinor,
      categoryId: categoryId > 0 ? categoryId : 0,
    });
  }, [
    previewableDrafts,
    waivers,
    previewAsMinor,
    previewCategoryId,
    categories,
  ]);

  const updateDraft = (key: string, patch: Partial<WaiverDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d._key !== key) return d;
        if (
          Object.prototype.hasOwnProperty.call(patch, "pdf_url") &&
          patch.pdf_url !== d.pdf_url
        ) {
          revokeIfBlobUrl(d.pdf_url);
        }
        return { ...d, ...patch };
      }),
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => {
      const doomed = prev.find((d) => d._key === key);
      revokeIfBlobUrl(doomed?.pdf_url);
      pdfPendingRef.current.delete(key);
      return prev.filter((d) => d._key !== key);
    });
  };

  const toggleDraftCategory = (key: string, categoryId: number, checked: boolean) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d._key !== key) return d;
        const current = new Set(d.category_ids ?? []);
        if (checked) current.add(categoryId);
        else current.delete(categoryId);
        const next = [...current];
        return { ...d, category_ids: next.length > 0 ? next : null };
      }),
    );
  };

  const handleSave = async () => {
    const valid = drafts.filter(isDraftValid);
    if (drafts.length > 0 && valid.length === 0) return;

    setUploading(true);
    try {
      const payload: EventWaiverInput[] = [];
      for (let i = 0; i < valid.length; i++) {
        const d = valid[i];
        let pdf_url = d.pdf_url?.startsWith("blob:") ? null : (d.pdf_url ?? null);
        const pending = pdfPendingRef.current.get(d._key);
        if (pending) {
          pdf_url = await uploadEventAssetToCdn(
            pending,
            `event_${eventId}_waiver_${d.id ?? i}`,
            isAdmin,
            "document",
          );
        }
        payload.push({
          id: d.id,
          title: d.title.trim(),
          content_html: d.content_html ?? "",
          pdf_url,
          content_type: d.content_type ?? "html",
          audience: d.audience ?? "all",
          category_ids: d.category_ids?.length ? d.category_ids : null,
          sort_order: i,
        });
      }

      await dispatch(
        updateEventWaivers({
          eventId,
          role: staffRole,
          waivers: payload,
        }),
      );
      pdfPendingRef.current.clear();
    } finally {
      setUploading(false);
    }
  };

  const busy = savingWaiver || uploading;
  const canSave = drafts.length === 0 || drafts.some(isDraftValid);

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.waiverTitle")}
      hint={
        <>
          {t("staffPortal.eventEdit.waiverSubtitle")}
          <span className="block mt-0.5">{t("staffPortal.eventEdit.waiverMultiHint")}</span>
        </>
      }
    >
      {waiverError ? <p className="text-xs text-destructive">{waiverError}</p> : null}

      {drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("staffPortal.eventEdit.waiverEmpty")}</p>
      ) : (
        <div className="space-y-3 min-w-0">
          {drafts.map((d, index) => {
            const showHtml =
              d.content_type === "html" || d.content_type === "both";
            const showPdf =
              d.content_type === "pdf" || d.content_type === "both";
            const selectedCategoryIds = d.category_ids ?? [];

            return (
              <div
                key={d._key}
                className="rounded-md border border-border/60 p-2.5 space-y-2.5 bg-background/40 min-w-0"
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("staffPortal.eventEdit.waiverItemLabel", { index: index + 1 })}
                  </span>
                  {canManage && drafts.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeDraft(d._key)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
                </div>

                <FieldRow label={t("staffPortal.eventEdit.waiverName")}>
                  <Input
                    placeholder={t("staffPortal.eventEdit.waiverName")}
                    value={d.title}
                    disabled={!canManage}
                    onChange={(e) => updateDraft(d._key, { title: e.target.value })}
                  />
                </FieldRow>

                <FieldRow label={t("staffPortal.eventEdit.waiverContentType")}>
                  <Select
                    value={d.content_type ?? "html"}
                    disabled={!canManage}
                    onValueChange={(v) =>
                      updateDraft(d._key, {
                        content_type: v as WaiverDraft["content_type"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">
                        {t("staffPortal.eventEdit.waiverTypeHtml")}
                      </SelectItem>
                      <SelectItem value="pdf">
                        {t("staffPortal.eventEdit.waiverTypePdf")}
                      </SelectItem>
                      <SelectItem value="both">
                        {t("staffPortal.eventEdit.waiverTypeBoth")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                <FieldRow label={t("staffPortal.eventEdit.waiverAudience")}>
                  <Select
                    value={d.audience ?? "all"}
                    disabled={!canManage}
                    onValueChange={(v) =>
                      updateDraft(d._key, { audience: v as WaiverAudience })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("staffPortal.eventEdit.waiverAudienceAll")}
                      </SelectItem>
                      <SelectItem value="adult">
                        {t("staffPortal.eventEdit.waiverAudienceAdult")}
                      </SelectItem>
                      <SelectItem value="minor">
                        {t("staffPortal.eventEdit.waiverAudienceMinor")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                {categories.length > 0 ? (
                  <div className="space-y-2 rounded-md border border-border/70 p-2.5 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {t("staffPortal.eventEdit.waiverCategories")}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {t("staffPortal.eventEdit.waiverCategoriesHint")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 min-w-0">
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 text-sm min-w-0"
                        >
                          <Checkbox
                            checked={selectedCategoryIds.includes(cat.id)}
                            disabled={!canManage}
                            onCheckedChange={(checked) =>
                              toggleDraftCategory(d._key, cat.id, checked === true)
                            }
                          />
                          <span className="min-w-0 break-words">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showHtml ? (
                  <FieldRow label={t("staffPortal.eventEdit.waiverContent")}>
                    <RichHtmlEditor
                      value={d.content_html ?? ""}
                      onChange={(html) => {
                        if (
                          normalizeRichHtmlForCompare(html) ===
                          normalizeRichHtmlForCompare(d.content_html)
                        ) {
                          return;
                        }
                        logger.warn("[EventEdit dirty] waiver html onChange", {
                          key: d._key,
                          prevLen: (d.content_html ?? "").length,
                          nextLen: html.length,
                          prevPreview: (d.content_html ?? "").slice(0, 80),
                          nextPreview: html.slice(0, 80),
                        });
                        updateDraft(d._key, { content_html: html });
                      }}
                      placeholder={t("staffPortal.eventEdit.waiverContentPlaceholder")}
                    />
                  </FieldRow>
                ) : null}

                {showPdf ? (
                  <FieldRow label={t("staffPortal.eventEdit.waiverPdf")}>
                    <EventAssetUpload
                      kind="document"
                      previewUrl={d.pdf_url ?? null}
                      fileName={
                        pdfPendingRef.current.get(d._key)?.name ??
                        (d.pdf_url ? t("staffPortal.eventEdit.waiverPdfUploaded") : null)
                      }
                      onSelectFile={(file) => {
                        pdfPendingRef.current.set(d._key, file);
                        updateDraft(d._key, { pdf_url: URL.createObjectURL(file) });
                        bumpPendingPdf();
                      }}
                      onClear={() => {
                        pdfPendingRef.current.delete(d._key);
                        updateDraft(d._key, { pdf_url: null });
                        bumpPendingPdf();
                      }}
                    />
                  </FieldRow>
                ) : null}

                {d.id && waivers.find((w) => w.id === d.id) ? (
                  <p className="text-[11px] text-muted-foreground">
                    {t("staffPortal.eventEdit.waiverVersion", {
                      version: waivers.find((w) => w.id === d.id)!.version,
                    })}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={previewableDrafts.length === 0}
          onClick={() => {
            setPreviewAsMinor(false);
            setPreviewCategoryId(
              categories.length === 1 ? categories[0]!.id : "all",
            );
            setPreviewOpen(true);
          }}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          {t("staffPortal.eventEdit.waiverPreviewAthlete")}
        </Button>
        {canManage ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setDrafts((prev) => [...prev, EMPTY_WAIVER()])}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t("staffPortal.eventEdit.addWaiver")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-10"
              onClick={handleSave}
              disabled={busy || !canSave}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t("staffPortal.eventEdit.saveWaivers")}
            </Button>
          </>
        ) : null}
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto overflow-x-clip flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/60 space-y-1.5 text-left min-w-0">
            <SheetTitle className="min-w-0 break-words">
              {t("staffPortal.eventEdit.waiverPreviewTitle")}
            </SheetTitle>
            <SheetDescription className="min-w-0 break-words">
              {t("staffPortal.eventEdit.waiverPreviewDesc")}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-3 space-y-3 border-b border-border/60 min-w-0">
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {t("staffPortal.eventEdit.waiverPreviewAs")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row min-w-0">
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full sm:w-auto"
                  variant={!previewAsMinor ? "default" : "outline"}
                  onClick={() => setPreviewAsMinor(false)}
                >
                  {t("staffPortal.eventEdit.waiverPreviewAdult")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full sm:w-auto"
                  variant={previewAsMinor ? "default" : "outline"}
                  onClick={() => setPreviewAsMinor(true)}
                >
                  {t("staffPortal.eventEdit.waiverPreviewMinor")}
                </Button>
              </div>
            </div>

            {categories.length > 0 ? (
              <div className="space-y-1.5 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {t("staffPortal.eventEdit.waiverPreviewCategory")}
                </p>
                <Select
                  value={
                    previewCategoryId === "all"
                      ? "all"
                      : String(previewCategoryId)
                  }
                  onValueChange={(v) =>
                    setPreviewCategoryId(v === "all" ? "all" : Number(v))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 1 ? (
                      <SelectItem value="all">
                        {t("staffPortal.eventEdit.waiverPreviewCategoryFirst")}
                      </SelectItem>
                    ) : null}
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("staffPortal.eventEdit.waiverPreviewCount", {
                count: previewWaivers.length,
              })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-clip px-4 py-4 min-w-0">
            <WizardWaiverStep
              key={`preview-${previewAsMinor}-${previewCategoryId}-${previewWaivers
                .map((w) => w.id)
                .join(",")}`}
              waivers={previewWaivers}
              preview
              onAccepted={() => undefined}
            />
          </div>
        </SheetContent>
      </Sheet>
    </SectionShell>
  );
}

import type { MutableRefObject, Ref } from "react";
import type { FormikProps } from "formik";
import { Loader2, Save } from "lucide-react";
import RichHtmlEditor, {
  type RichHtmlEditorHandle,
} from "@/components/editor/RichHtmlEditor";
import { normalizeRichHtmlForCompare } from "@/utils/normalizeRichHtml";
import { logger } from "@/utils/logger";
import GeoCitySelector from "@/components/geo/GeoCitySelector";
import EventAssetUpload from "@/components/staff/EventAssetUpload";
import StaffFormMissingChips from "@/components/staff/StaffFormMissingChips";
import {
  FieldGroup,
  FieldRow,
  SectionShell,
  ToggleRow,
} from "@/components/staff/event-edit/primitives";
import type { EventEditDetailSection } from "@/components/staff/event-edit/eventEditDetailSections";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DateTimePickerField from "@/components/ui/datetime-picker-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StaffFormMissingItem } from "@/utils/staffFormMissing";
import type { EventEditFormValues } from "@/utils/buildStaffEventBody";
import type { FeePresentation, SportType } from "@shared/api";
import { cn } from "@/lib/utils";

export type EventEditDetailsTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export type CheckInAutoWindowHint = {
  opensAtLocal: string;
  closesAtLocal: string;
} | null;

export interface EventEditDetailsFormProps {
  /** Which Editar subsection to render (one focused panel per console nav leaf). */
  section: EventEditDetailSection;
  formik: FormikProps<EventEditFormValues>;
  t: EventEditDetailsTranslate;
  sportTypes: SportType[];
  isAdmin: boolean;
  isNew: boolean;
  endDateBeforeStart: boolean;
  checkInAutoWindowHint: CheckInAutoWindowHint;
  checkInCapHint: string | null;
  citySelectionIncomplete: boolean;
  geoStateId: number | null;
  geoCityId: number | null;
  geoLegacySearchResolved: boolean;
  setGeoStateId: (id: number | null) => void;
  setGeoCityId: (id: number | null) => void;
  setGeoLegacySearchResolved: (resolved: boolean) => void;
  geoUserTouchedRef: MutableRefObject<boolean>;
  onGeoUserTouched?: () => void;
  effectiveFeePresentation: FeePresentation;
  eventOrganizerStripeReady: boolean;
  onFeePresentationChange: (value: string) => void;
  heroPreviewUrl: string | null;
  bannerPreviewUrl: string | null;
  onHeroSelectFile: (file: File) => void;
  onHeroClear: () => void;
  onBannerSelectFile: (file: File) => void;
  onBannerClear: () => void;
  descriptionEditorRef: Ref<RichHtmlEditorHandle>;
  descriptionHtmlRef: MutableRefObject<string>;
  stageDescriptionImage: (file: File) => string | null;
  eventDetailsMissing: StaffFormMissingItem[];
  savingEvent: boolean;
  uploadingAssets: boolean;
  className?: string;
}

const SECTION_HINT_KEYS: Record<EventEditDetailSection, string> = {
  details: "staffPortal.eventEdit.sectionHints.details",
  location: "staffPortal.eventEdit.sectionHints.location",
  checkin: "staffPortal.eventEdit.sectionHints.checkin",
  registration: "staffPortal.eventEdit.sectionHints.registration",
  description: "staffPortal.eventEdit.sectionHints.description",
  images: "staffPortal.eventEdit.sectionHints.images",
  policies: "staffPortal.eventEdit.sectionHints.policies",
};

/**
 * Focused event editor panel — one console nav leaf at a time (identity, hero, …).
 */
export default function EventEditDetailsForm({
  section,
  formik,
  t,
  sportTypes,
  isAdmin,
  isNew,
  endDateBeforeStart,
  checkInAutoWindowHint,
  checkInCapHint,
  citySelectionIncomplete,
  geoStateId,
  geoCityId,
  geoLegacySearchResolved,
  setGeoStateId,
  setGeoCityId,
  setGeoLegacySearchResolved,
  geoUserTouchedRef,
  onGeoUserTouched,
  effectiveFeePresentation,
  eventOrganizerStripeReady,
  onFeePresentationChange,
  heroPreviewUrl,
  bannerPreviewUrl,
  onHeroSelectFile,
  onHeroClear,
  onBannerSelectFile,
  onBannerClear,
  descriptionEditorRef,
  descriptionHtmlRef,
  stageDescriptionImage,
  eventDetailsMissing,
  savingEvent,
  uploadingAssets,
  className,
}: EventEditDetailsFormProps) {
  const showAdminPolicies = !isNew && isAdmin;
  const showMissing =
    section === "details" || section === "location" || section === "description";

  return (
    <SectionShell
      as="form"
      onSubmit={formik.handleSubmit}
      className={cn(className)}
      hint={t(SECTION_HINT_KEYS[section])}
    >
      {section === "details" ? (
        <FieldGroup title={t("staffPortal.eventEdit.setupGuide.steps.details")}>
            <div className="grid sm:grid-cols-2 gap-2">
              <FieldRow
                id="title"
                label={t("staffPortal.eventEdit.fieldTitle")}
                fullWidth
                error={
                  formik.touched.title && formik.errors.title
                    ? formik.errors.title
                    : undefined
                }
              >
                <Input id="title" className="h-9" {...formik.getFieldProps("title")} />
              </FieldRow>

              <FieldRow
                id="sport_type_id"
                label={t("staffPortal.eventEdit.fieldSport")}
                error={
                  formik.touched.sport_type_id && formik.errors.sport_type_id
                    ? formik.errors.sport_type_id
                    : undefined
                }
              >
                <Select
                  value={
                    formik.values.sport_type_id > 0
                      ? String(formik.values.sport_type_id)
                      : undefined
                  }
                  onValueChange={(v) => {
                    const next = Number(v);
                    if (!Number.isFinite(next) || next <= 0) {
                      logger.warn("[EventEdit dirty] sport Select ignored invalid", {
                        v,
                      });
                      return;
                    }
                    if (next === formik.values.sport_type_id) return;
                    logger.warn("[EventEdit dirty] sport Select setFieldValue", {
                      from: formik.values.sport_type_id,
                      to: next,
                      formikDirtyBefore: formik.dirty,
                    });
                    void formik.setFieldValue("sport_type_id", next);
                  }}
                >
                  <SelectTrigger id="sport_type_id" className="h-9">
                    <SelectValue
                      placeholder={t("staffPortal.eventEdit.fieldSportPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sportTypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>

              <FieldRow
                id="start_date"
                label={t("staffPortal.eventEdit.fieldStart")}
                error={
                  formik.touched.start_date && formik.errors.start_date
                    ? formik.errors.start_date
                    : undefined
                }
              >
                <DateTimePickerField
                  id="start_date"
                  value={formik.values.start_date}
                  onChange={(v) => void formik.setFieldValue("start_date", v)}
                  onBlur={() => void formik.setFieldTouched("start_date", true)}
                  invalid={Boolean(
                    formik.touched.start_date && formik.errors.start_date,
                  )}
                />
              </FieldRow>

              <FieldRow
                id="end_date"
                label={t("staffPortal.eventEdit.fieldEnd")}
                error={
                  endDateBeforeStart
                    ? t("staffPortal.eventEdit.validation.endBeforeStart")
                    : formik.touched.end_date && formik.errors.end_date
                      ? formik.errors.end_date
                      : undefined
                }
                hint={
                  !endDateBeforeStart && formik.values.end_date
                    ? t("staffPortal.eventEdit.fieldEndHint")
                    : undefined
                }
              >
                <DateTimePickerField
                  id="end_date"
                  value={formik.values.end_date}
                  onChange={(v) => void formik.setFieldValue("end_date", v)}
                  onBlur={() => void formik.setFieldTouched("end_date", true)}
                  invalid={Boolean(
                    endDateBeforeStart ||
                      (formik.touched.end_date && formik.errors.end_date),
                  )}
                />
              </FieldRow>
            </div>
          </FieldGroup>
      ) : null}

      {section === "checkin" ? (
        <FieldGroup
          title={t("staffPortal.eventEdit.fieldCheckInSection")}
          hint={t("staffPortal.eventEdit.fieldCheckInSectionHint")}
        >
          <div className="grid sm:grid-cols-2 gap-2">
            <FieldRow
              id="check_in_opens_at"
              label={t("staffPortal.eventEdit.fieldCheckInOpens")}
              error={
                formik.touched.check_in_opens_at && formik.errors.check_in_opens_at
                  ? formik.errors.check_in_opens_at
                  : undefined
              }
            >
              <DateTimePickerField
                id="check_in_opens_at"
                value={formik.values.check_in_opens_at}
                onChange={(v) => void formik.setFieldValue("check_in_opens_at", v)}
                onBlur={() => void formik.setFieldTouched("check_in_opens_at", true)}
                invalid={Boolean(
                  formik.touched.check_in_opens_at && formik.errors.check_in_opens_at,
                )}
              />
            </FieldRow>
            <FieldRow
              id="check_in_closes_at"
              label={t("staffPortal.eventEdit.fieldCheckInCloses")}
              error={
                formik.touched.check_in_closes_at && formik.errors.check_in_closes_at
                  ? formik.errors.check_in_closes_at
                  : undefined
              }
            >
              <DateTimePickerField
                id="check_in_closes_at"
                value={formik.values.check_in_closes_at}
                onChange={(v) => void formik.setFieldValue("check_in_closes_at", v)}
                onBlur={() => void formik.setFieldTouched("check_in_closes_at", true)}
                invalid={Boolean(
                  formik.touched.check_in_closes_at &&
                    formik.errors.check_in_closes_at,
                )}
              />
            </FieldRow>
          </div>
          {checkInAutoWindowHint ? (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("staffPortal.eventEdit.fieldCheckInAutoHint", {
                opens: checkInAutoWindowHint.opensAtLocal,
                closes: checkInAutoWindowHint.closesAtLocal,
              })}
            </p>
          ) : null}
          {checkInCapHint ? (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("staffPortal.eventEdit.fieldCheckInCapHint", {
                closes: checkInCapHint,
              })}
            </p>
          ) : null}
        </FieldGroup>
      ) : null}

      {section === "location" ? (
        <FieldGroup
          title={t("staffPortal.eventEdit.locationSection")}
          hint={t("staffPortal.eventEdit.locationSectionHint")}
        >
          <GeoCitySelector
            className="w-full"
            stateId={geoStateId}
            cityId={geoCityId}
            cityName={formik.values.location_city}
            stateName={formik.values.location_state}
            staffRole={isAdmin ? "admin" : "organizer"}
            legacySearchResolved={geoLegacySearchResolved}
            onChange={(sel) => {
              geoUserTouchedRef.current = true;
              onGeoUserTouched?.();
              setGeoStateId(sel.stateId);
              setGeoCityId(sel.geoCityId);
              setGeoLegacySearchResolved(false);
              void formik.setFieldValue("location_city", sel.city);
              void formik.setFieldValue("location_state", sel.state);
              if (!sel.city) {
                void formik.setFieldValue("location_lat", "");
                void formik.setFieldValue("location_lng", "");
                return;
              }
              if (sel.lat != null) {
                void formik.setFieldValue("location_lat", String(sel.lat));
              }
              if (sel.lng != null) {
                void formik.setFieldValue("location_lng", String(sel.lng));
              }
            }}
          />
          {citySelectionIncomplete ? (
            <p className="text-[11px] text-destructive leading-snug">
              {t("staffPortal.eventEdit.validation.cityFromCatalog")}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <FieldRow
              id="location_name"
              label={t("staffPortal.eventEdit.fieldVenue")}
              className="sm:col-span-2 lg:col-span-3"
            >
              <Input
                id="location_name"
                className="h-9"
                {...formik.getFieldProps("location_name")}
              />
            </FieldRow>
            <FieldRow id="location_lat" label={t("staffPortal.eventEdit.fieldLat")}>
              <Input
                id="location_lat"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="19.4326"
                className="h-9"
                {...formik.getFieldProps("location_lat")}
              />
            </FieldRow>
            <FieldRow
              id="location_lng"
              label={t("staffPortal.eventEdit.fieldLng")}
              className="sm:col-span-2 lg:col-span-2"
              hint={t("staffPortal.eventEdit.fieldLocationHint")}
            >
              <Input
                id="location_lng"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="-99.1332"
                className="h-9"
                {...formik.getFieldProps("location_lng")}
              />
            </FieldRow>
          </div>
        </FieldGroup>
      ) : null}

      {section === "registration" ? (
        <>
          <FieldGroup title={t("staffPortal.eventEdit.fieldMaxRegs")}>
            <div className="grid sm:grid-cols-2 gap-2">
              <FieldRow
                id="max_registrations"
                label={t("staffPortal.eventEdit.fieldMaxRegs")}
                hint={t("staffPortal.eventEdit.fieldMaxRegsHint")}
              >
                <Input
                  id="max_registrations"
                  type="number"
                  min={0}
                  className="h-9"
                  {...formik.getFieldProps("max_registrations")}
                />
              </FieldRow>
              <FieldRow
                id="max_registrations_per_order"
                label={t("staffPortal.eventEdit.fieldMaxRegsPerOrder")}
                hint={t("staffPortal.eventEdit.fieldMaxRegsPerOrderHint")}
              >
                <Input
                  id="max_registrations_per_order"
                  type="number"
                  min={1}
                  max={20}
                  className="h-9"
                  {...formik.getFieldProps("max_registrations_per_order")}
                />
              </FieldRow>
            </div>
          </FieldGroup>

          {!isNew ? (
            <FieldGroup title={t("staffPortal.eventEdit.fieldRegOpens")}>
              <div className="grid sm:grid-cols-2 gap-2">
                <FieldRow
                  id="registration_opens_at"
                  label={t("staffPortal.eventEdit.fieldRegOpens")}
                >
                  <DateTimePickerField
                    id="registration_opens_at"
                    value={formik.values.registration_opens_at}
                    onChange={(v) =>
                      void formik.setFieldValue("registration_opens_at", v)
                    }
                    onBlur={() =>
                      void formik.setFieldTouched("registration_opens_at", true)
                    }
                  />
                </FieldRow>
                <FieldRow
                  id="registration_closes_at"
                  label={t("staffPortal.eventEdit.fieldRegCloses")}
                >
                  <DateTimePickerField
                    id="registration_closes_at"
                    value={formik.values.registration_closes_at}
                    onChange={(v) =>
                      void formik.setFieldValue("registration_closes_at", v)
                    }
                    onBlur={() =>
                      void formik.setFieldTouched("registration_closes_at", true)
                    }
                  />
                </FieldRow>
              </div>
            </FieldGroup>
          ) : null}
        </>
      ) : null}

      {section === "images" ? (
        <FieldGroup title={t("staffPortal.eventSetup.cards.images.title")}>
          <div className="grid gap-4">
            <FieldRow
              label={t("staffPortal.eventEdit.fieldHero")}
              hint={t("staffPortal.eventEdit.fieldHeroHint")}
            >
              <EventAssetUpload
                kind="image"
                imageRole="hero"
                staffIsAdmin={isAdmin}
                previewUrl={heroPreviewUrl}
                onSelectFile={onHeroSelectFile}
                onClear={onHeroClear}
              />
              <Input
                id="hero_image_url"
                className="h-9 mt-1"
                placeholder={t("staffPortal.eventEdit.fieldHeroUrlFallback")}
                {...formik.getFieldProps("hero_image_url")}
              />
            </FieldRow>
            <FieldRow
              label={t("staffPortal.eventEdit.fieldBanner")}
              hint={t("staffPortal.eventEdit.fieldBannerHint")}
            >
              <EventAssetUpload
                kind="image"
                imageRole="banner"
                staffIsAdmin={isAdmin}
                previewUrl={bannerPreviewUrl}
                onSelectFile={onBannerSelectFile}
                onClear={onBannerClear}
              />
              <Input
                id="banner_image_url"
                className="h-9 mt-1"
                placeholder={t("staffPortal.eventEdit.fieldBannerUrlFallback")}
                {...formik.getFieldProps("banner_image_url")}
              />
            </FieldRow>
          </div>
        </FieldGroup>
      ) : null}

      {section === "description" ? (
        <FieldGroup title={t("staffPortal.eventEdit.fieldDesc")}>
          <div className="grid gap-2">
            <FieldRow
              id="short_description"
              label={t("staffPortal.eventEdit.fieldShortDesc")}
            >
              <Textarea
                id="short_description"
                rows={2}
                className="min-h-[2.5rem]"
                {...formik.getFieldProps("short_description")}
              />
            </FieldRow>
            <FieldRow
              id="description"
              label={t("staffPortal.eventEdit.fieldDesc")}
              hint={t("staffPortal.eventEdit.fieldDescHint")}
            >
              <RichHtmlEditor
                ref={descriptionEditorRef}
                value={formik.values.description}
                onChange={(html) => {
                  descriptionHtmlRef.current = html;
                  if (
                    normalizeRichHtmlForCompare(html) ===
                    normalizeRichHtmlForCompare(formik.values.description)
                  ) {
                    return;
                  }
                  logger.warn("[EventEdit dirty] description onChange -> setFieldValue", {
                    prevLen: formik.values.description.length,
                    nextLen: html.length,
                    formikDirtyBefore: formik.dirty,
                    prevPreview: formik.values.description.slice(0, 80),
                    nextPreview: html.slice(0, 80),
                  });
                  void formik.setFieldValue("description", html);
                }}
                onStageImage={stageDescriptionImage}
                placeholder={t("staffPortal.eventEdit.fieldDescPlaceholder")}
              />
            </FieldRow>
          </div>
        </FieldGroup>
      ) : null}

      {section === "policies" && showAdminPolicies ? (
        <FieldGroup title={t("staffPortal.eventEdit.fieldStatus")}>
          <div className="grid sm:grid-cols-2 gap-2">
            <FieldRow id="status" label={t("staffPortal.eventEdit.fieldStatus")}>
              <Select
                value={formik.values.status}
                onValueChange={(v) => {
                  if (v === formik.values.status) return;
                  logger.warn("[EventEdit dirty] status Select setFieldValue", {
                    from: formik.values.status,
                    to: v,
                    formikDirtyBefore: formik.dirty,
                  });
                  void formik.setFieldValue("status", v);
                }}
              >
                <SelectTrigger id="status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      ["draft", "staffPortal.events.statusDraft"],
                      ["pending_approval", "staffPortal.events.statusPendingApproval"],
                      // Published only via POST .../publish — keep option when already published
                      ...(formik.values.status === "published"
                        ? ([["published", "staffPortal.events.statusPublished"]] as const)
                        : []),
                      ["completed", "staffPortal.events.statusCompleted"],
                      ["cancelled", "staffPortal.events.statusCancelled"],
                    ] as const
                  ).map(([value, labelKey]) => (
                    <SelectItem key={value} value={value}>
                      {t(labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              id="visibility"
              label={t("staffPortal.eventEdit.fieldVisibility")}
            >
              <Select
                value={formik.values.visibility}
                onValueChange={(v) => {
                  if (v === formik.values.visibility) return;
                  logger.warn("[EventEdit dirty] visibility Select setFieldValue", {
                    from: formik.values.visibility,
                    to: v,
                    formikDirtyBefore: formik.dirty,
                  });
                  void formik.setFieldValue("visibility", v);
                }}
              >
                <SelectTrigger id="visibility" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["public", "private", "unlisted"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`staffPortal.eventEdit.visibility.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              id="fee_presentation"
              label={t("staffPortal.eventEdit.fieldFeePresentation")}
              fullWidth
              hint={t("staffPortal.eventEdit.fieldFeePresentationHint")}
            >
              <Select
                value={formik.values.fee_presentation}
                onValueChange={onFeePresentationChange}
              >
                <SelectTrigger id="fee_presentation" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">
                    {t("staffPortal.eventEdit.feePresentation.inherit")}
                  </SelectItem>
                  <SelectItem value="pass_through">
                    {t("staffPortal.eventEdit.feePresentation.passThrough")}
                  </SelectItem>
                  <SelectItem value="absorb_all">
                    {t("staffPortal.eventEdit.feePresentation.absorbAll")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {formik.values.fee_presentation === "inherit" ? (
                <p className="text-[11px] text-muted-foreground rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 mt-1 leading-snug">
                  {t(
                    effectiveFeePresentation === "absorb_all"
                      ? "staffPortal.eventEdit.feePresentationEffectiveAbsorb"
                      : "staffPortal.eventEdit.feePresentationEffectivePassThrough",
                  )}
                </p>
              ) : null}
            </FieldRow>

            <div className="sm:col-span-2 space-y-1.5">
              {eventOrganizerStripeReady ? (
                <ToggleRow
                  label={t("staffPortal.eventEdit.fieldMsiEnabled")}
                  description={t("staffPortal.eventEdit.fieldMsiEnabledHint")}
                  control={
                    <Checkbox
                      checked={formik.values.msi_enabled}
                      onCheckedChange={(v) =>
                        formik.setFieldValue("msi_enabled", v === true)
                      }
                    />
                  }
                />
              ) : null}

              <ToggleRow
                label={t("staffPortal.eventEdit.fieldManualSalesEnabled")}
                description={t(
                  "staffPortal.eventEdit.fieldManualSalesEnabledHint",
                )}
                control={
                  <Checkbox
                    checked={formik.values.manual_sales_enabled}
                    onCheckedChange={(v) =>
                      formik.setFieldValue("manual_sales_enabled", v === true)
                    }
                  />
                }
              />

              <ToggleRow
                label={t("staffPortal.eventEdit.fieldRequiresWaiver")}
                description={t("staffPortal.eventEdit.fieldRequiresWaiverHint")}
                control={
                  <Checkbox
                    checked={formik.values.requires_waiver}
                    onCheckedChange={(v) =>
                      formik.setFieldValue("requires_waiver", v === true)
                    }
                  />
                }
              />

              <ToggleRow
                label={t("staffPortal.eventEdit.fieldAutoDeactivate")}
                description={t("staffPortal.eventEdit.fieldAutoDeactivateHint")}
                control={
                  <Checkbox
                    checked={formik.values.auto_deactivate_after_event}
                    onCheckedChange={(v) =>
                      formik.setFieldValue(
                        "auto_deactivate_after_event",
                        v === true,
                      )
                    }
                  />
                }
              />
            </div>
          </div>
        </FieldGroup>
      ) : null}

      {section === "policies" && !showAdminPolicies ? (
        <p className="text-sm text-muted-foreground">
          {t("staffPortal.eventEdit.policiesAdminOnly")}
        </p>
      ) : null}

      {showMissing ? (
        <StaffFormMissingChips
          items={eventDetailsMissing}
          showCompleteState={eventDetailsMissing.length === 0}
        />
      ) : null}

      <Button
        type="submit"
        disabled={
          savingEvent ||
          uploadingAssets ||
          sportTypes.length === 0 ||
          formik.values.sport_type_id <= 0
        }
        className="w-full sm:w-auto"
      >
        {savingEvent || uploadingAssets ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {uploadingAssets
          ? t("staffPortal.eventEdit.savingAssets")
          : isNew
            ? t("staffPortal.eventEdit.create")
            : t("staffPortal.eventEdit.save")}
      </Button>
    </SectionShell>
  );
}

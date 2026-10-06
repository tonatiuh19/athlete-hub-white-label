import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveApexHostname } from "@/utils/hostContext";
import { useFormik, type FormikProps } from "formik";
import * as Yup from "yup";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Loader2,
  Rocket,
  Save,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useSectionDirtyRegistry } from "@/hooks/use-section-dirty-registry";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useSpaLocationGuard } from "@/hooks/use-spa-location-guard";
import { logger } from "@/utils/logger";
import MetaHelmet from "@/components/MetaHelmet";
import PortalErrorAlert from "@/components/athlete/PortalErrorAlert";
import { type RichHtmlEditorHandle } from "@/components/editor/RichHtmlEditor";
import StaffCourseSummaryCard from "@/components/staff/StaffCourseSummaryCard";
import StaffCourseWizardDialog from "@/components/staff/StaffCourseWizardDialog";
import StaffEventCategoriesSection from "@/components/staff/StaffEventCategoriesSection";
import StaffEventExtrasSection from "@/components/staff/StaffEventExtrasSection";
import StaffEventBibModePicker from "@/components/staff/StaffEventBibModePicker";
import StaffEventFolioSegmentsSection from "@/components/staff/StaffEventFolioSegmentsSection";
import StaffEventWaiversSection from "@/components/staff/StaffEventWaiversSection";
import {
  StaffPageSkeleton,
} from "@/components/staff/skeletons/StaffSkeletons";
import EventPublishPreviewDialog from "@/components/staff/EventPublishPreviewDialog";
import {
  computeEventPublishReadiness,
} from "@/components/staff/StaffEventPublishChecklist";
import EventEditorLayout from "@/components/staff/event-edit/EventEditorLayout";
import EventEditGuidedNav, {
  buildEventEditVisibleTabs,
} from "@/components/staff/event-edit/EventEditGuidedNav";
import EventEditOverview from "@/components/staff/event-edit/EventEditOverview";
import EventEditDetailsForm from "@/components/staff/event-edit/EventEditDetailsForm";
import {
  EVENT_EDIT_DETAIL_SECTIONS,
  normalizeEventEditDetailTab,
} from "@/components/staff/event-edit/eventEditDetailSections";
import EventEditFieldsSection from "@/components/staff/event-edit/EventEditFieldsSection";
import EventEditWavesSection from "@/components/staff/event-edit/EventEditWavesSection";
import EventEditDiscountsSection from "@/components/staff/event-edit/EventEditDiscountsSection";
import EventEditSponsorsSection from "@/components/staff/event-edit/EventEditSponsorsSection";
import EventEditDiscardDialog from "@/components/staff/event-edit/EventEditDiscardDialog";
import EventEditMediaSection from "@/components/staff/event-edit/EventEditMediaSection";
import EventEditWaitlistSection from "@/components/staff/event-edit/EventEditWaitlistSection";
import { SectionShell } from "@/components/staff/event-edit/primitives";
import { useEventConsole } from "@/components/staff/event-console/EventConsoleContext";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import { useRegisterEventConsoleNavigationGuard } from "@/components/staff/event-console/EventConsoleNavigationGuardContext";
import StaffStatusBadge from "@/components/staff/StaffStatusBadge";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  enforceCatalogCityOnEventBody,
  isCatalogCitySelectionValid,
} from "@/utils/geoCityValidation";
import {
  resolveStaffEventFeePresentation,
  resolveStaffEventServiceFeePercent,
} from "@/utils/staffFeePresentation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchGeoCities, fetchGeoStates } from "@/store/slices/geoSlice";
import { fetchSportTypes } from "@/store/slices/marketplaceSlice";
import {
  createDiscountCode,
  createOrganizerEvent,
  deleteDiscountCode,
  fetchDiscountCodes,
  fetchFolioSegments,
  fetchEventCourse,
  fetchEventMedia,
  fetchEventSponsors,
  fetchEventWaitlist,
  fetchEventWaivers,
  fetchRegistrationFields,
  fetchScheduleWaves,
  fetchStaffEventDetail,
  fetchOrganizerPayoutStatus,
  fetchAdminOrganizerConnect,
  publishStaffEvent,
  rejectStaffEventApproval,
  updateDiscountCode,
  updateFolioSegments,
  updateEventCourse,
  updateEventMedia,
  updateEventSponsors,
  offerWaitlistSpot,
  revokeWaitlistEntry,
  updateRegistrationFields,
  updateScheduleWaves,
  updateStaffEvent,
} from "@/store/slices/staffPortalSlice";
import type {
  EventRegistrationFieldInput,
  EventSponsorInput,
  StaffDiscountCodeInput,
  StaffFolioSegmentInput,
  StaffEventCoursePayload,
  StaffEventDetail,
  StaffMediaAssetRow,
  StaffScheduleWaveInput,
} from "@shared/api";
import { getNumberLocale } from "@/utils/dateLocale";
import {
  buildEventEditFormValues,
  buildStaffEventBody,
  type EventEditFormValues,
} from "@/utils/buildStaffEventBody";
import { isStaffEventCreateRoute } from "@/utils/staffEventRoutes";
import { eventSetupPath } from "@/utils/eventSetupSections";
import { buildEventEditPreviewData } from "@/utils/buildEventEditPreviewData";
import {
  computeEventSetupProgressPct,
  filterVisibleSetupSections,
} from "@/utils/eventSetupProgress";
import {
  galleryItemsFromEvent,
  previewHeroAndMediaFromGallery,
} from "@/utils/eventCreateGallery";
import { getFormikMissingItems } from "@/utils/staffFormMissing";
import { normalizeCoursePayloadForSave } from "@/utils/courseMapUtils";
import { isEventEndBeforeStart } from "@/utils/staffEventDateValidation";
import {
  checkInCloseWouldBeCapped,
  defaultCheckInWindowBounds,
  normalizeFormDatetimeLocal,
  validateCheckInWindowFields,
  type CheckInWindowValidationError,
} from "@shared/checkInWindow";
import { fromDatetimeLocal, toDatetimeLocal } from "@/utils/datetimeLocal";
import { uploadEventAssetToCdn } from "@/lib/cdn-upload";
import { normalizeCdnUploadUrl } from "@/lib/cdn-url";
import { prepareEventImageFile } from "@/utils/eventImageUpload";
import {
  createBlobPreviewUrl,
  revokeBlobUrl,
  uploadPendingHtmlImages,
} from "@/lib/pendingMediaImages";
import { validateImageFile } from "@/utils/imageFileValidation";
import {
  canOrganizerCreateEvents,
  canOrganizerEditEvents,
  staffPayoutSetupPath,
} from "@/utils/staffNav";
import {
  parseFormCoordinate,
  validateFormCoordinatePair,
  type FormCoordinateError,
} from "@/utils/formCoordinates";
import { isCoursePayloadDirty } from "@/utils/eventEditUnsavedState";

const CHECK_IN_VALIDATION_KEYS: Record<CheckInWindowValidationError, string> = {
  pair_required: "staffPortal.eventEdit.fieldCheckInErrorPair",
  opens_not_before_closes: "staffPortal.eventEdit.fieldCheckInErrorOrder",
  opens_after_event_end: "staffPortal.eventEdit.fieldCheckInErrorOpensAfterEnd",
  closes_after_event_end: "staffPortal.eventEdit.fieldCheckInErrorClosesAfterEnd",
};

const COORD_VALIDATION_KEYS: Record<FormCoordinateError, string> = {
  pair_required: "staffPortal.eventEdit.fieldCoordErrorPair",
  invalid_lat: "staffPortal.eventEdit.fieldCoordErrorLat",
  invalid_lng: "staffPortal.eventEdit.fieldCoordErrorLng",
};

export default function StaffEventEdit() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const isNew = isStaffEventCreateRoute(location.pathname, eventIdParam);
  const tabFromUrl = searchParams.get("tab");
  const normalizedTabFromUrl = normalizeEventEditDetailTab(tabFromUrl) ?? tabFromUrl;
  const eventId = isNew ? null : Number(eventIdParam);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const inEventConsole = Boolean(useEventConsole()?.active);
  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { sportTypes } = useAppSelector((s) => s.marketplace);
  const {
    eventDetail,
    eventSponsors,
    registrationFields,
    eventWaivers,
    scheduleWaves,
    eventCourse,
    discountCodes,
    folioSegments,
    eventMedia,
    waitlistEntries,
    loadingEventMedia,
    eventMediaError,
    savingEventMedia,
    loadingWaitlist,
    waitlistError,
    offeringWaitlist,
    loadingEventDetail,
    eventDetailError,
    savingEvent,
    saveEventError,
    publishingEvent,
    rejectingEventApproval,
    publishError,
    payoutStatus,
    adminOrganizerConnect,
    loadingPayoutStatus,
    loadingAdminOrganizerConnect,
    savingSponsors,
    sponsorsError,
    savingFields,
    fieldsError,
    savingWaves,
    wavesError,
    savingCourse,
    courseError,
    savingDiscountCode,
    discountCodesError,
    savingFolioSegments,
    folioSegmentsError,
  } = useAppSelector((s) => s.staffPortal);

  const [tab, setTab] = useState(() => {
    if (normalizedTabFromUrl) return normalizedTabFromUrl;
    return isNew ? "details" : "overview";
  });

  const handleTabChange = useCallback(
    (next: string) => {
      const normalized = normalizeEventEditDetailTab(next) ?? next;
      setTab(normalized);
      const params = new URLSearchParams(searchParams);
      if (normalized === "overview") params.delete("tab");
      else params.set("tab", normalized);
      params.delete("from");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const markGeoDirty = useCallback(() => {
    geoUserTouchedRef.current = true;
    setGeoDirty(true);
  }, []);

  // Rewrite legacy ?tab=hero|banner bookmarks to ?tab=images
  useEffect(() => {
    if (tabFromUrl !== "hero" && tabFromUrl !== "banner") return;
    const params = new URLSearchParams(searchParams);
    params.set("tab", "images");
    setSearchParams(params, { replace: true });
  }, [tabFromUrl, searchParams, setSearchParams]);

  const [courseWizardOpen, setCourseWizardOpen] = useState(false);
  const [publishPreviewOpen, setPublishPreviewOpen] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [heroPendingFile, setHeroPendingFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [bannerPendingFile, setBannerPendingFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const sponsorPendingRef = useRef<Map<number, File>>(new Map());
  const mediaPendingRef = useRef<Map<number, File>>(new Map());
  const descriptionPendingByUrlRef = useRef<Map<string, File>>(new Map());
  const descriptionDraftUploadIdRef = useRef(`event_draft_${Date.now()}`);
  const descriptionEditorRef = useRef<RichHtmlEditorHandle>(null);
  const descriptionHtmlRef = useRef("");
  const hydratedEventIdRef = useRef<number | null>(null);
  const geoPickerHydratedRef = useRef<number | null>(null);
  const geoUserTouchedRef = useRef(false);
  const formValuesRef = useRef(buildEventEditFormValues(undefined, []));
  const formikRef = useRef<FormikProps<EventEditFormValues> | null>(null);
  const [fieldDrafts, setFieldDrafts] = useState<EventRegistrationFieldInput[]>([]);
  const [sponsorDrafts, setSponsorDrafts] = useState<EventSponsorInput[]>([]);
  const [waveDrafts, setWaveDrafts] = useState<StaffScheduleWaveInput[]>([]);
  const [courseDraft, setCourseDraft] = useState<StaffEventCoursePayload | null>(null);
  const [mediaDrafts, setMediaDrafts] = useState<StaffMediaAssetRow[]>([]);
  const [geoStateId, setGeoStateId] = useState<number | null>(null);
  const [geoCityId, setGeoCityId] = useState<number | null>(null);
  const [geoLegacySearchResolved, setGeoLegacySearchResolved] = useState(false);
  const [geoDirty, setGeoDirty] = useState(false);
  const [descriptionAssetsPending, setDescriptionAssetsPending] = useState(false);
  const { setSectionDirty: setSectionDirtyRaw, clearAllSectionDirty, anySectionDirty, flags: sectionDirtyFlags } =
    useSectionDirtyRegistry();
  const [sectionRemountKey, setSectionRemountKey] = useState(0);
  /** False until first resetForm for this event — avoids Select write-back of defaults. */
  const [editorHydrated, setEditorHydrated] = useState(false);
  const setSectionDirty = useCallback(
    (key: string, dirty: boolean) => {
      if (dirty) {
        logger.warn("[EventEdit dirty] section -> true", { key });
      } else {
        logger.debug("[EventEdit dirty] section -> false", { key });
      }
      setSectionDirtyRaw(key, dirty);
    },
    [setSectionDirtyRaw],
  );
  const reportCategoriesDirty = useCallback(
    (dirty: boolean) => setSectionDirty("categories", dirty),
    [setSectionDirty],
  );
  const reportExtrasDirty = useCallback(
    (dirty: boolean) => setSectionDirty("extras", dirty),
    [setSectionDirty],
  );
  const reportSponsorsDirty = useCallback(
    (dirty: boolean) => setSectionDirty("sponsors", dirty),
    [setSectionDirty],
  );
  const reportFieldsDirty = useCallback(
    (dirty: boolean) => setSectionDirty("fields", dirty),
    [setSectionDirty],
  );
  const reportWaiversDirty = useCallback(
    (dirty: boolean) => setSectionDirty("waivers", dirty),
    [setSectionDirty],
  );
  const reportWavesDirty = useCallback(
    (dirty: boolean) => setSectionDirty("waves", dirty),
    [setSectionDirty],
  );
  const reportDiscountsDirty = useCallback(
    (dirty: boolean) => setSectionDirty("discounts", dirty),
    [setSectionDirty],
  );
  const reportFoliosDirty = useCallback(
    (dirty: boolean) => setSectionDirty("folios", dirty),
    [setSectionDirty],
  );
  const reportMediaDirty = useCallback(
    (dirty: boolean) => setSectionDirty("media", dirty),
    [setSectionDirty],
  );

  const eventSchema = useMemo(
    () =>
      Yup.object({
        title: Yup.string()
          .trim()
          .required(t("staffPortal.eventEdit.validation.required"))
          .max(255),
        sport_type_id: Yup.number()
          .min(1, t("staffPortal.eventEdit.validation.required"))
          .required(t("staffPortal.eventEdit.validation.required")),
        start_date: Yup.string().required(t("staffPortal.eventEdit.validation.required")),
        end_date: Yup.string(),
        check_in_opens_at: Yup.string(),
        check_in_closes_at: Yup.string(),
      })
        .test("end-after-start", function (values) {
          if (!values.end_date?.trim()) return true;
          if (!isEventEndBeforeStart(values.start_date, values.end_date)) return true;
          return this.createError({
            path: "end_date",
            message: t("staffPortal.eventEdit.validation.endBeforeStart"),
          });
        })
        .test("check-in-window", function (values) {
          const err = validateCheckInWindowFields({
            checkInOpensAt: values.check_in_opens_at,
            checkInClosesAt: values.check_in_closes_at,
            startDate: values.start_date,
            endDate: values.end_date,
          });
          if (!err) return true;
          return this.createError({
            path: err === "pair_required" ? "check_in_opens_at" : "check_in_closes_at",
            message: t(CHECK_IN_VALIDATION_KEYS[err]),
          });
        }),
    [t],
  );
  const geoStates = useAppSelector((s) => s.geo.states);
  const geoCitiesByState = useAppSelector((s) => s.geo.citiesByStateId);
  const numLocale = getNumberLocale(i18n.language);
  const isAdmin = role === "admin";

  const descriptionUploadId = useMemo(
    () =>
      eventId != null
        ? `event_${eventId}_desc`
        : descriptionDraftUploadIdRef.current,
    [eventId],
  );

  const stageDescriptionImage = useCallback(
    (file: File): string | null => {
      const validationError = validateImageFile(file, t);
      if (validationError) {
        toast({
          title: t("staffPortal.eventEdit.descriptionImageFailed"),
          description: validationError,
          variant: "destructive",
        });
        return null;
      }
      const previewUrl = createBlobPreviewUrl(file);
      descriptionPendingByUrlRef.current.set(previewUrl, file);
      setDescriptionAssetsPending(descriptionPendingByUrlRef.current.size > 0);
      return previewUrl;
    },
    [t, toast],
  );
  const isOrganizer = role === "organizer";
  const staffRole = role === "admin" ? "admin" : "organizer";
  const organizerMemberRole = user?.type === "organizer" ? user.role : "organizer";
  const canEditEvents = isAdmin || canOrganizerEditEvents(organizerMemberRole);
  const canCreateEvents = isAdmin || canOrganizerCreateEvents(organizerMemberRole);
  const canManageEventContent = !isNew && eventId != null && (isAdmin || (isOrganizer && canEditEvents));
  const canManageSponsors = canManageEventContent;
  const canManageCategories = canManageEventContent;

  useEffect(() => {
    dispatch(fetchSportTypes());
    dispatch(fetchGeoStates("MX"));
  }, [dispatch]);

  useEffect(() => {
    if (!isNew && eventId && role && user) {
      const cachedId = eventDetail?.event?.id;
      if (cachedId === eventId) return;
      dispatch(fetchStaffEventDetail({ eventId, role }));
    }
  }, [dispatch, isNew, eventId, role, user, eventDetail?.event?.id]);

  useEffect(() => {
    if (canManageSponsors && eventId && role && user) {
      dispatch(fetchEventSponsors({ eventId, role: role === "admin" ? "admin" : "organizer" }));
    }
    if (canManageEventContent && eventId && role && user) {
      const staffRole = role === "admin" ? "admin" : "organizer";
      dispatch(fetchRegistrationFields({ eventId, role: staffRole }));
      dispatch(fetchEventWaivers({ eventId, role: staffRole }));
      dispatch(fetchScheduleWaves({ eventId, role }));
      dispatch(fetchEventCourse({ eventId, role }));
      dispatch(fetchDiscountCodes({ eventId, role }));
      dispatch(fetchFolioSegments({ eventId, role }));
      dispatch(fetchEventMedia({ eventId, role: staffRole }));
      dispatch(fetchEventWaitlist({ eventId, role: staffRole }));
    }
  }, [dispatch, canManageSponsors, canManageEventContent, eventId, role, user]);

  useEffect(() => {
    setMediaDrafts(
      eventMedia.map((m, i) => ({
        ...m,
        sort_order: m.sort_order ?? i,
        asset_type: m.asset_type || "gallery",
      })),
    );
  }, [eventMedia]);

  useEffect(() => {
    setSponsorDrafts(
      eventSponsors.map((s, i) => ({
        name: s.name,
        logo_url: s.logo_url,
        website_url: s.website_url,
        tier: s.tier,
        sort_order: s.sort_order ?? i,
      })),
    );
  }, [eventSponsors]);

  useEffect(() => {
    setFieldDrafts(
      registrationFields.map((f, i) => ({
        field_key: f.field_key,
        label: f.label,
        field_type: f.field_type,
        is_required: Boolean(f.is_required),
        sort_order: f.sort_order ?? i,
        is_active: f.is_active !== 0 && f.is_active !== false,
        scope_type: f.scope_type ?? "all_categories",
        category_ids: f.category_ids ?? [],
        options: (() => {
          try {
            if (typeof f.options_json === "string") {
              return JSON.parse(f.options_json || "[]") as string[];
            }
            if (Array.isArray(f.options_json)) return f.options_json;
          } catch {
            /* ignore invalid JSON */
          }
          return [];
        })(),
      })),
    );
  }, [registrationFields]);

  useEffect(() => {
    setWaveDrafts(
      scheduleWaves.map((w, i) => ({
        name: w.name,
        starts_at: toDatetimeLocal(w.starts_at),
        event_category_id: w.event_category_id ?? null,
        capacity: w.capacity ?? null,
        sort_order: w.sort_order ?? i,
      })),
    );
  }, [scheduleWaves]);

  useEffect(() => {
    setCourseDraft(eventCourse ?? null);
  }, [eventCourse]);

  const event = eventDetail?.event;
  const organizerAccessDenied =
    isOrganizer &&
    !isAdmin &&
    ((isNew && !canCreateEvents) || (!isNew && !canEditEvents));

  const defaultFormValues = useMemo(
    () => buildEventEditFormValues(undefined, sportTypes),
    [sportTypes],
  );

  const savedEventLocation = useMemo(
    () =>
      event
        ? { city: event.location_city, state: event.location_state }
        : undefined,
    [event?.location_city, event?.location_state],
  );

  const formik = useFormik({
    enableReinitialize: false,
    initialValues: defaultFormValues,
    validationSchema: eventSchema,
    onSubmit: async (values) => {
      if (!role) return;
      if (
        !isCatalogCitySelectionValid(
          geoCityId,
          values.location_city,
          savedEventLocation,
          values.location_state,
        )
      ) {
        toast({
          title: t("geo.citySelector.invalidSelectionTitle"),
          description: isAdmin
            ? t("geo.citySelector.supportMessageAdmin")
            : t("geo.citySelector.supportMessageOrganizer"),
          variant: "destructive",
        });
        return;
      }
      const coordError = validateFormCoordinatePair(
        parseFormCoordinate(values.location_lat),
        parseFormCoordinate(values.location_lng),
      );
      if (coordError) {
        toast({
          title: t("staffPortal.eventEdit.saveFailed"),
          description: t(COORD_VALIDATION_KEYS[coordError]),
          variant: "destructive",
        });
        return;
      }
      setUploadingAssets(true);
      try {
        let heroUrl = values.hero_image_url.trim() || null;
        if (heroPendingFile) {
          const heroUploadId =
            eventId != null ? `event_${eventId}_hero` : `${descriptionUploadId}_hero`;
          const preparedHero = await prepareEventImageFile(heroPendingFile, "hero");
          heroUrl = await uploadEventAssetToCdn(
            preparedHero,
            heroUploadId,
            isAdmin,
            "hero",
          );
          setHeroPendingFile(null);
          if (heroPreviewUrl?.startsWith("blob:")) revokeBlobUrl(heroPreviewUrl);
          setHeroPreviewUrl(heroUrl);
          void formik.setFieldValue("hero_image_url", heroUrl ?? "");
        }

        let bannerUrl = values.banner_image_url.trim() || null;
        if (bannerPendingFile) {
          const bannerUploadId =
            eventId != null ? `event_${eventId}_banner` : `${descriptionUploadId}_banner`;
          const preparedBanner = await prepareEventImageFile(bannerPendingFile, "banner");
          bannerUrl = await uploadEventAssetToCdn(
            preparedBanner,
            bannerUploadId,
            isAdmin,
            "hero",
          );
          setBannerPendingFile(null);
          if (bannerPreviewUrl?.startsWith("blob:")) revokeBlobUrl(bannerPreviewUrl);
          setBannerPreviewUrl(bannerUrl);
          void formik.setFieldValue("banner_image_url", bannerUrl ?? "");
        }

        let description =
          descriptionEditorRef.current?.getHtml() ??
          descriptionHtmlRef.current ??
          values.description;
        descriptionHtmlRef.current = description;
        if (descriptionPendingByUrlRef.current.size > 0) {
          description = await uploadPendingHtmlImages({
            html: description,
            pendingByUrl: descriptionPendingByUrlRef.current,
            uploadId: descriptionUploadId,
            isAdmin,
          });
          for (const blobUrl of descriptionPendingByUrlRef.current.keys()) {
            if (!description.includes(blobUrl)) {
              revokeBlobUrl(blobUrl);
            }
          }
          descriptionPendingByUrlRef.current.clear();
          setDescriptionAssetsPending(false);
          void formik.setFieldValue("description", description);
        }

        const body = enforceCatalogCityOnEventBody(
          buildStaffEventBody(values, {
            hero_image_url: heroUrl,
            banner_image_url: bannerUrl,
            description: description.trim() || null,
          }),
          geoCityId,
          savedEventLocation,
        );

        if (isNew) {
          const result = await dispatch(createOrganizerEvent(body));
          if (createOrganizerEvent.fulfilled.match(result)) {
            const newEventId = result.payload.event.id;
            toast({
              title: t("staffPortal.eventEdit.createSuccess"),
              description: t("staffPortal.eventEdit.createSuccessHint"),
            });
            navigate(eventSetupPath(newEventId), { replace: true });
            return;
          }
          if (createOrganizerEvent.rejected.match(result)) {
            toast({
              title: t("staffPortal.eventEdit.createFailed"),
              description: result.payload ?? t("staffPortal.eventEdit.createFailed"),
              variant: "destructive",
            });
          }
          return;
        }

        if (eventId) {
          const updateResult = await dispatch(updateStaffEvent({ eventId, role, body }));
          if (updateStaffEvent.fulfilled.match(updateResult)) {
            hydratedEventIdRef.current = updateResult.payload.event.id;
            const savedValues = buildEventEditFormValues(
              updateResult.payload.event,
              sportTypes,
            );
            descriptionHtmlRef.current = savedValues.description;
            setGeoDirty(false);
            setDescriptionAssetsPending(false);
            void formik.resetForm({ values: savedValues });
            toast({ title: t("staffPortal.eventEdit.saveSuccess") });
          } else if (updateStaffEvent.rejected.match(updateResult)) {
            toast({
              title: t("staffPortal.eventEdit.saveFailed"),
              description: updateResult.payload ?? t("staffPortal.eventEdit.saveFailed"),
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        toast({
          title: t("staffPortal.eventEdit.saveFailed"),
          description: err instanceof Error ? err.message : t("staffPortal.eventEdit.saveFailed"),
          variant: "destructive",
        });
      } finally {
        setUploadingAssets(false);
      }
    },
  });

  formikRef.current = formik;
  formValuesRef.current = formik.values;

  const eventDetailsMissing = useMemo(
    () =>
      getFormikMissingItems(formik.values, eventSchema, {
        title: "staffPortal.eventEdit.fieldTitle",
        sport_type_id: "staffPortal.eventEdit.fieldSport",
        start_date: "staffPortal.eventEdit.fieldStart",
        end_date: "staffPortal.eventEdit.fieldEnd",
        check_in_opens_at: "staffPortal.eventEdit.fieldCheckInOpens",
        check_in_closes_at: "staffPortal.eventEdit.fieldCheckInCloses",
      }),
    [eventSchema, formik.values],
  );

  const courseDirty = isCoursePayloadDirty(courseDraft, eventCourse);

  const isEventEditDirty = useMemo(
    () =>
      formik.dirty ||
      Boolean(heroPendingFile) ||
      Boolean(bannerPendingFile) ||
      descriptionAssetsPending ||
      geoDirty ||
      courseDirty ||
      anySectionDirty,
    [
      formik.dirty,
      heroPendingFile,
      bannerPendingFile,
      descriptionAssetsPending,
      geoDirty,
      courseDirty,
      anySectionDirty,
    ],
  );

  // TEMP diagnostic: identify which dirty contributor sticks true on load.
  // Filter console by "[EventEdit dirty]". Remove after root cause is fixed.
  useEffect(() => {
    const changedFields: string[] = [];
    if (formik.dirty) {
      const initial = formik.initialValues as Record<string, unknown>;
      const values = formik.values as Record<string, unknown>;
      for (const key of Object.keys(values)) {
        const a = initial[key];
        const b = values[key];
        if (a !== b && JSON.stringify(a) !== JSON.stringify(b)) {
          changedFields.push(key);
        }
      }
    }
    const breakdown = {
      isEventEditDirty,
      formikDirty: formik.dirty,
      changedFields,
      sport: {
        value: formik.values.sport_type_id,
        initial: formik.initialValues.sport_type_id,
      },
      descriptionLen: {
        value: String(formik.values.description ?? "").length,
        initial: String(formik.initialValues.description ?? "").length,
      },
      location: {
        value: {
          city: formik.values.location_city,
          state: formik.values.location_state,
        },
        initial: {
          city: formik.initialValues.location_city,
          state: formik.initialValues.location_state,
        },
      },
      heroPendingFile: Boolean(heroPendingFile),
      bannerPendingFile: Boolean(bannerPendingFile),
      descriptionAssetsPending,
      geoDirty,
      courseDirty,
      courseDraftNull: courseDraft == null,
      eventCourseNull: eventCourse == null,
      anySectionDirty,
      sectionDirtyFlags,
      tab,
      eventId,
      hydratedEventId: hydratedEventIdRef.current,
    };
    if (isEventEditDirty) {
      logger.warn("[EventEdit dirty] STUCK/TRUE", breakdown);
    } else {
      logger.debug("[EventEdit dirty] clean", {
        tab,
        eventId,
        sectionDirtyFlags,
      });
    }
  }, [
    isEventEditDirty,
    formik.dirty,
    formik.initialValues,
    formik.values,
    heroPendingFile,
    bannerPendingFile,
    descriptionAssetsPending,
    geoDirty,
    courseDirty,
    courseDraft,
    eventCourse,
    anySectionDirty,
    sectionDirtyFlags,
    tab,
    eventId,
  ]);

  const { dialogOpen, discardIntent, confirmDiscard, cancelDiscard, requestNavigation, allowNavigationRef } =
    useUnsavedChangesGuard(isEventEditDirty);

  useSpaLocationGuard(isEventEditDirty, requestNavigation, allowNavigationRef);

  useEffect(() => {
    if (isNew) return;
    const nextTab = normalizedTabFromUrl ?? "overview";
    if (nextTab !== tab) setTab(nextTab);
  }, [normalizedTabFromUrl, isNew, tab]);

  const guardedTabChange = useCallback(
    (next: string) => {
      if (next === tab) return;
      requestNavigation(() => handleTabChange(next), "switchTab");
    },
    [tab, requestNavigation, handleTabChange],
  );

  useRegisterEventConsoleNavigationGuard(
    inEventConsole ? isEventEditDirty : false,
    requestNavigation,
  );

  const unsavedStatus = isEventEditDirty ? (
    <span className="text-xs text-destructive font-medium whitespace-nowrap">
      {t("staffPortal.eventEdit.unsavedChanges")}
    </span>
  ) : null;

  const applySavedEventToForm = useCallback(
    (savedEvent: StaffEventDetail) => {
      const values = buildEventEditFormValues(savedEvent, sportTypes);
      descriptionHtmlRef.current = values.description;
      setGeoDirty(false);
      setDescriptionAssetsPending(false);
      logger.info("[EventEdit dirty] hydrate resetForm", {
        eventId: savedEvent.id,
        sport_type_id: values.sport_type_id,
        status: values.status,
        visibility: values.visibility,
        descriptionLen: values.description.length,
        location_state: values.location_state,
      });
      // Keep Selects unmounted until formik.values catch up (see effect below).
      setEditorHydrated(false);
      void formikRef.current?.resetForm({ values });
    },
    [sportTypes],
  );

  const discardEventEditChanges = useCallback(() => {
    if (event) {
      applySavedEventToForm(event);
    }
    if (heroPreviewUrl?.startsWith("blob:")) revokeBlobUrl(heroPreviewUrl);
    if (bannerPreviewUrl?.startsWith("blob:")) revokeBlobUrl(bannerPreviewUrl);
    setHeroPendingFile(null);
    setBannerPendingFile(null);
    setHeroPreviewUrl(
      event?.hero_image_url ? normalizeCdnUploadUrl(event.hero_image_url) : null,
    );
    setBannerPreviewUrl(
      event?.banner_image_url
        ? normalizeCdnUploadUrl(event.banner_image_url)
        : null,
    );
    for (const url of descriptionPendingByUrlRef.current.keys()) {
      revokeBlobUrl(url);
    }
    descriptionPendingByUrlRef.current.clear();
    sponsorPendingRef.current.clear();
    mediaPendingRef.current.clear();
    setDescriptionAssetsPending(false);
    setGeoDirty(false);
    geoUserTouchedRef.current = false;
    setCourseDraft(eventCourse ?? null);
    clearAllSectionDirty();
    // Remount nested section Formiks so draft edits are dropped with the main form.
    setSectionRemountKey((n) => n + 1);
  }, [
    event,
    eventCourse,
    applySavedEventToForm,
    heroPreviewUrl,
    bannerPreviewUrl,
    clearAllSectionDirty,
  ]);

  const handleConfirmDiscard = useCallback(() => {
    discardEventEditChanges();
    confirmDiscard();
  }, [discardEventEditChanges, confirmDiscard]);

  useEffect(() => {
    geoUserTouchedRef.current = false;
    geoPickerHydratedRef.current = null;
    setGeoDirty(false);
    setDescriptionAssetsPending(false);
    setEditorHydrated(false);
    if (isNew) {
      hydratedEventIdRef.current = null;
      return;
    }
    if (eventId != null && hydratedEventIdRef.current !== eventId) {
      hydratedEventIdRef.current = null;
    }
  }, [eventId, isNew]);

  useEffect(() => {
    if (isNew || !event?.id) return;
    if (hydratedEventIdRef.current === event.id) return;
    // Wait for sport catalog so the sport Select mounts with a matching item.
    if (sportTypes.length === 0) return;
    hydratedEventIdRef.current = event.id;
    applySavedEventToForm(event);
  }, [isNew, event, applySavedEventToForm, sportTypes.length]);

  // Mount Selects only once formik.values match the saved event (after resetForm commit).
  useEffect(() => {
    if (isNew || !event?.id) return;
    if (hydratedEventIdRef.current !== event.id) return;
    if (editorHydrated) return;
    if (formik.values.sport_type_id !== event.sport_type_id) return;
    if (formik.values.status !== event.status) return;
    if (formik.values.visibility !== event.visibility) return;
    logger.info("[EventEdit dirty] editorHydrated — mounting Selects", {
      sport_type_id: formik.values.sport_type_id,
      status: formik.values.status,
      visibility: formik.values.visibility,
      formikDirty: formik.dirty,
    });
    setEditorHydrated(true);
    setSectionRemountKey((n) => n + 1);
  }, [
    isNew,
    event?.id,
    event?.sport_type_id,
    event?.status,
    event?.visibility,
    editorHydrated,
    formik.values.sport_type_id,
    formik.values.status,
    formik.values.visibility,
    formik.dirty,
  ]);

  useEffect(() => {
    if (!isNew) return;
    if (sportTypes.length === 0) return;
    if (formik.values.sport_type_id > 0) return;
    const nextId = sportTypes[0]!.id;
    logger.warn("[EventEdit dirty] create sport default resetForm", {
      nextId,
      current: formik.values.sport_type_id,
    });
    void formik.resetForm({
      values: { ...formik.values, sport_type_id: nextId },
    });
    // Only default sport on create; never race edit hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid formik object identity churn
  }, [isNew, sportTypes, formik.values.sport_type_id, formik.resetForm]);

  useEffect(() => {
    if (!isNew) return;
    setGeoStateId(null);
    setGeoCityId(null);
    setGeoLegacySearchResolved(false);
  }, [isNew]);

  // One-time geo picker hydrate from saved event — never override after user edits.
  useEffect(() => {
    if (isNew || !event?.id || !event.location_city) return;
    if (geoUserTouchedRef.current) return;
    if (geoPickerHydratedRef.current === event.id) return;
    if (geoStates.length === 0) return;

    const applyCityMatch = (cities: { id: number; name: string }[]) => {
      if (geoUserTouchedRef.current) return;
      geoPickerHydratedRef.current = event.id;
      const cityMatch = cities.find((c) => c.name === event.location_city);
      if (cityMatch) {
        setGeoCityId(cityMatch.id);
      }
    };

    const stateMatch = geoStates.find(
      (s) =>
        s.name === event.location_state ||
        s.code === event.location_state ||
        (!event.location_state && s.name === "CDMX"),
    );

    if (stateMatch) {
      setGeoStateId(stateMatch.id);
      const cached = geoCitiesByState[stateMatch.id];
      if (cached?.length) {
        applyCityMatch(cached);
        return;
      }
      void dispatch(fetchGeoCities({ stateId: stateMatch.id })).then((action) => {
        if (!fetchGeoCities.fulfilled.match(action)) return;
        applyCityMatch(action.payload.cities);
      });
      return;
    }

    if (event.location_state) return;

    void dispatch(fetchGeoCities({ q: event.location_city })).then((action) => {
      if (geoUserTouchedRef.current) return;
      setGeoLegacySearchResolved(true);
      geoPickerHydratedRef.current = event.id;
      if (!fetchGeoCities.fulfilled.match(action)) return;
      const match = action.payload.cities.find((c) => c.name === event.location_city);
      if (!match) return;
      setGeoStateId(match.state_id);
      setGeoCityId(match.id);
      const current = formikRef.current;
      if (!current) return;
      logger.warn("[EventEdit dirty] geo legacy location_state resetForm", {
        state: match.state_name,
        before: current.values.location_state,
      });
      // Rebase initial values so catalog state fill does not trip unsaved guard.
      void current.resetForm({
        values: { ...current.values, location_state: match.state_name },
      });
    });
  }, [
    dispatch,
    isNew,
    event?.id,
    event?.location_city,
    event?.location_state,
    geoStates,
    geoCitiesByState,
  ]);

  useEffect(() => {
    if (event?.hero_image_url && !heroPendingFile) {
      setHeroPreviewUrl(normalizeCdnUploadUrl(event.hero_image_url));
    }
  }, [event?.hero_image_url, heroPendingFile]);

  useEffect(() => {
    if (event?.banner_image_url && !bannerPendingFile) {
      setBannerPreviewUrl(normalizeCdnUploadUrl(event.banner_image_url));
    }
  }, [event?.banner_image_url, bannerPendingFile]);

  useEffect(() => {
    if (event?.id) {
      descriptionPendingByUrlRef.current.clear();
    }
  }, [event?.id]);

  useEffect(() => {
    return () => {
      for (const url of descriptionPendingByUrlRef.current.keys()) {
        revokeBlobUrl(url);
      }
    };
  }, []);

  const activeWaivers = useMemo(
    () => eventWaivers.filter((w) => Boolean(w.is_active)),
    [eventWaivers],
  );

  const waiverPublishBlocked =
    formik.values.requires_waiver &&
    !activeWaivers.some((w) => {
      if (w.content_type === "pdf") return Boolean(w.pdf_url?.trim());
      if (w.content_type === "both") {
        return Boolean(w.content_html?.trim() || w.pdf_url?.trim());
      }
      return Boolean(w.content_html?.trim());
    });

  const checkInAutoWindowHint = useMemo(() => {
    if (formik.values.check_in_opens_at || formik.values.check_in_closes_at) {
      return null;
    }
    const startWall = normalizeFormDatetimeLocal(formik.values.start_date);
    if (!startWall) return null;
    const endWall = normalizeFormDatetimeLocal(formik.values.end_date);
    return defaultCheckInWindowBounds(startWall, endWall);
  }, [
    formik.values.check_in_closes_at,
    formik.values.check_in_opens_at,
    formik.values.end_date,
    formik.values.start_date,
  ]);

  const endDateBeforeStart = useMemo(
    () => isEventEndBeforeStart(formik.values.start_date, formik.values.end_date),
    [formik.values.end_date, formik.values.start_date],
  );

  const citySelectionIncomplete =
    Boolean(formik.values.location_city.trim()) && geoCityId == null;

  const checkInCapHint = useMemo(() => {
    if (!formik.values.check_in_closes_at) return null;
    if (
      !checkInCloseWouldBeCapped({
        checkInClosesAt: formik.values.check_in_closes_at,
        startDate: formik.values.start_date,
        endDate: formik.values.end_date,
      })
    ) {
      return null;
    }
    const startWall = normalizeFormDatetimeLocal(formik.values.start_date);
    if (!startWall) return null;
    const endWall = normalizeFormDatetimeLocal(formik.values.end_date);
    return defaultCheckInWindowBounds(startWall, endWall).closesAtLocal;
  }, [
    formik.values.check_in_closes_at,
    formik.values.end_date,
    formik.values.start_date,
  ]);

  const hasPaidCategories = useMemo(
    () => (eventDetail?.categories ?? []).some((c) => c.is_active && Number(c.price_cents) > 0),
    [eventDetail?.categories],
  );

  const effectiveFeePresentation = useMemo(
    () =>
      resolveStaffEventFeePresentation(
        formik.values.fee_presentation === "inherit"
          ? null
          : formik.values.fee_presentation,
        event?.organizer_fee_presentation,
      ),
    [formik.values.fee_presentation, event?.organizer_fee_presentation],
  );

  const staffServiceFeePercent = useMemo(
    () =>
      resolveStaffEventServiceFeePercent(
        event?.service_fee_percent,
        event?.organizer_service_fee_percent,
      ),
    [event?.service_fee_percent, event?.organizer_service_fee_percent],
  );

  const handleFeePresentationChange = (value: string) => {
    const nextEffective = resolveStaffEventFeePresentation(
      value === "inherit" ? null : (value as "pass_through" | "absorb_all"),
      event?.organizer_fee_presentation,
    );
    if (hasPaidCategories && nextEffective !== effectiveFeePresentation) {
      if (!window.confirm(t("staffPortal.eventEdit.feePresentationSwitchConfirm"))) {
        return;
      }
    }
    void formik.setFieldValue("fee_presentation", value);
  };

  useEffect(() => {
    if (isAdmin && hasPaidCategories && event?.organizer_id) {
      void dispatch(fetchAdminOrganizerConnect({ organizerId: event.organizer_id }));
    } else if (!isAdmin && isOrganizer && hasPaidCategories) {
      void dispatch(fetchOrganizerPayoutStatus());
    }
  }, [dispatch, event?.organizer_id, hasPaidCategories, isAdmin, isOrganizer]);

  const eventOrganizerPayoutReady = isAdmin
    ? adminOrganizerConnect?.payoutReady
    : payoutStatus?.payoutReady;

  const eventOrganizerStripeReady = isAdmin
    ? Boolean(adminOrganizerConnect?.stripeReady)
    : Boolean(payoutStatus?.stripeReady);

  const loadingPayoutGate = hasPaidCategories
    ? isAdmin
      ? loadingAdminOrganizerConnect && !adminOrganizerConnect
      : loadingPayoutStatus && !payoutStatus
    : false;

  const payoutPublishBlocked =
    hasPaidCategories &&
    (loadingPayoutGate || eventOrganizerPayoutReady !== true) &&
    (isOrganizer || isAdmin);

  // Banner when paid ticket types exist and payout setup is incomplete.
  const showPayoutBlockedBanner = payoutPublishBlocked;

  const handlePayoutSetupNavigate = () => {
    const path = staffPayoutSetupPath(isAdmin, event?.organizer_id);
    requestNavigation(() => navigate(path));
  };

  const handleOpenOpsHub = useCallback(() => {
    if (!eventId) return;
    requestNavigation(() => navigate(`/staff/events/${eventId}/ops`));
  }, [eventId, navigate, requestNavigation]);

  const publishReadiness = useMemo(
    () =>
      computeEventPublishReadiness({
        title: formik.values.title,
        sportTypeId: formik.values.sport_type_id,
        startDate: formik.values.start_date,
        categoryCount: eventDetail?.categories?.length ?? 0,
        heroUrl: heroPreviewUrl || formik.values.hero_image_url,
        locationLat: formik.values.location_lat,
        locationLng: formik.values.location_lng,
        hasWaiver: activeWaivers.some((w) => {
          if (w.content_type === "pdf") return Boolean(w.pdf_url?.trim());
          if (w.content_type === "both") {
            return Boolean(w.content_html?.trim() || w.pdf_url?.trim());
          }
          return Boolean(w.content_html?.trim());
        }),
        hasCourse: Boolean(courseDraft?.routeGeojson),
        hasSiteLegal: Boolean(Number(event?.site_legal_ready)),
        hasPaidCategories,
        payoutReady: hasPaidCategories
          ? loadingPayoutGate
            ? null
            : eventOrganizerPayoutReady === true
          : undefined,
      }),
    [
      activeWaivers,
      courseDraft?.routeGeojson,
      event?.site_legal_ready,
      eventDetail?.categories?.length,
      eventOrganizerPayoutReady,
      formik.values,
      hasPaidCategories,
      heroPreviewUrl,
      loadingPayoutGate,
    ],
  );

  const publishBlocked =
    !publishReadiness.hasTitle ||
    !publishReadiness.hasSport ||
    !publishReadiness.hasStartDate ||
    !publishReadiness.hasCategory ||
    !publishReadiness.hasSiteLegal ||
    waiverPublishBlocked ||
    payoutPublishBlocked;

  const setupVisibleSections = useMemo(
    () =>
      filterVisibleSetupSections(hasPaidCategories, publishReadiness.payoutReady),
    [hasPaidCategories, publishReadiness.payoutReady],
  );

  const setupProgressPct = computeEventSetupProgressPct(
    publishReadiness,
    setupVisibleSections,
  );
  const setupRequiredDone = !publishBlocked;

  const visibleEditTabs = useMemo(
    () =>
      buildEventEditVisibleTabs({
        isNew,
        canManageCategories,
        canManageSponsors,
        isAdmin,
      }),
    [isNew, canManageCategories, canManageSponsors, isAdmin],
  );

  useEffect(() => {
    if (isNew || tab === "overview") return;
    if (!visibleEditTabs.has(tab)) {
      handleTabChange("overview");
    }
  }, [isNew, tab, visibleEditTabs, handleTabChange]);

  const sportTypeForPreview = useMemo(
    () => sportTypes.find((st) => st.id === formik.values.sport_type_id),
    [sportTypes, formik.values.sport_type_id],
  );

  const organizerPreviewName = useMemo(() => {
    if (user?.type === "organizer") {
      return user.organizerName ?? `${user.firstName} ${user.lastName}`.trim();
    }
    return event?.organizer_name;
  }, [user, event?.organizer_name]);

  const previewGallery = useMemo(() => {
    const items = galleryItemsFromEvent(
      heroPreviewUrl || formik.values.hero_image_url || event?.hero_image_url,
      mediaDrafts.length > 0 ? mediaDrafts : eventMedia,
    );
    return previewHeroAndMediaFromGallery(items);
  }, [
    heroPreviewUrl,
    formik.values.hero_image_url,
    event?.hero_image_url,
    mediaDrafts,
    eventMedia,
  ]);

  const editPreview = useMemo(
    () =>
      buildEventEditPreviewData({
        formValues: formik.values,
        event,
        categories: eventDetail?.categories ?? [],
        heroPreviewUrl: previewGallery.heroUrl ?? heroPreviewUrl,
        bannerPreviewUrl,
        media: previewGallery.media,
        sportName: sportTypeForPreview?.name,
        sportSlug: sportTypeForPreview?.slug,
        organizerName: organizerPreviewName,
        organizerLogo: null,
      }),
    [
      formik.values,
      event,
      eventDetail?.categories,
      previewGallery,
      heroPreviewUrl,
      bannerPreviewUrl,
      sportTypeForPreview,
      organizerPreviewName,
    ],
  );

  const guidedNavProps = {
    activeTab: tab,
    onNavigate: guardedTabChange,
    readiness: publishReadiness,
    hasPaidCategories,
    visibleTabIds: visibleEditTabs,
  };

  const handleEventLocationFromCourse = useCallback((lat: number, lng: number) => {
    void formikRef.current?.setFieldValue("location_lat", String(lat));
    void formikRef.current?.setFieldValue("location_lng", String(lng));
  }, []);

  if (isNew && isAdmin) {
    return <Navigate to="/staff/events" replace />;
  }

  if (!isNew && (!eventId || Number.isNaN(eventId))) {
    return <Navigate to="/staff/events" replace />;
  }

  const handlePublish = async () => {
    if (!eventId || !role) return;
    const result = await dispatch(publishStaffEvent({ eventId, role }));
    if (publishStaffEvent.fulfilled.match(result)) {
      formik.setFieldValue(
        "status",
        isAdmin ? "published" : "pending_approval",
      );
      setPublishPreviewOpen(false);
    }
  };

  const handleRejectApproval = async () => {
    if (!eventId || !isAdmin) return;
    const result = await dispatch(rejectStaffEventApproval({ eventId }));
    if (rejectStaffEventApproval.fulfilled.match(result)) {
      formik.setFieldValue("status", "draft");
    }
  };

  const eventStatus = event?.status ?? formik.values.status;
  const showOrganizerSubmit =
    isOrganizer && !isAdmin && eventStatus === "draft";
  const showAdminPublish =
    isAdmin && eventStatus !== "published" && eventStatus !== "cancelled";
  const showPendingBanner = eventStatus === "pending_approval";
  const rejectionReason =
    event?.approval_rejection_reason?.trim() || null;
  const showRejectionBanner =
    !isAdmin && eventStatus === "draft" && Boolean(rejectionReason);
  const publishActionLabel = isAdmin
    ? eventStatus === "pending_approval"
      ? t("staffPortal.eventEdit.approvePublish")
      : t("staffPortal.eventEdit.publish")
    : t("staffPortal.eventEdit.submitForApproval");

  const handleSaveSponsors = async (sponsors: EventSponsorInput[]) => {
    if (!eventId || !role) return;
    setUploadingAssets(true);
    try {
      const next = [...sponsors];
      for (const [index, file] of sponsorPendingRef.current.entries()) {
        const prepared = await prepareEventImageFile(file, "sponsor");
        const url = await uploadEventAssetToCdn(
          prepared,
          `event_${eventId}_sponsor_${index}`,
          isAdmin,
          "sponsor",
        );
        if (next[index]) next[index] = { ...next[index], logo_url: url };
      }
      sponsorPendingRef.current.clear();
      setSponsorDrafts(next);
      dispatch(
        updateEventSponsors({
          eventId,
          role: staffRole,
          sponsors: next.filter((s) => s.name.trim()),
        }),
      );
    } finally {
      setUploadingAssets(false);
    }
  };

  const handleSaveFields = (fields: EventRegistrationFieldInput[]) => {
    if (!eventId || !role) return;
    dispatch(
      updateRegistrationFields({
        eventId,
        role: staffRole,
        fields: fields
          .filter((f) => f.label.trim())
          .map((f) => ({
            ...f,
            scope_type:
              f.scope_type === "selected_categories"
                ? "selected_categories"
                : "all_categories",
            category_ids:
              f.scope_type === "selected_categories" ? f.category_ids ?? [] : [],
          })),
      }),
    );
  };

  const handleSaveMedia = async (media: StaffMediaAssetRow[]) => {
    if (!eventId || !role) return;
    setUploadingAssets(true);
    try {
      const next = [...media];
      for (const [index, file] of mediaPendingRef.current.entries()) {
        const uploadRole = media[index]?.asset_type === "banner" ? "banner" : "gallery";
        const prepared = await prepareEventImageFile(file, uploadRole);
        const url = await uploadEventAssetToCdn(
          prepared,
          `event_${eventId}_media_${index}`,
          isAdmin,
          "image",
        );
        if (next[index]) next[index] = { ...next[index], url };
      }
      mediaPendingRef.current.clear();
      setMediaDrafts(next);
      dispatch(
        updateEventMedia({
          eventId,
          role: staffRole,
          media: next.filter((m) => m.url.trim()),
        }),
      );
    } finally {
      setUploadingAssets(false);
    }
  };

  const handleSaveWaves = (waves: StaffScheduleWaveInput[]) => {
    if (!eventId || !role) return;
    dispatch(
      updateScheduleWaves({
        eventId,
        role,
        waves: waves
          .filter((w) => w.name.trim() && w.starts_at)
          .map((w, i) => ({
            ...w,
            starts_at: fromDatetimeLocal(w.starts_at) ?? w.starts_at,
            sort_order: i,
          })),
      }),
    );
  };

  const handleSaveCourse = (course?: StaffEventCoursePayload) => {
    const raw = course ?? courseDraft;
    if (!eventId || !raw || !role) return;
    const payload = normalizeCoursePayloadForSave(raw);
    setCourseDraft(payload);
    return dispatch(updateEventCourse({ eventId, role, course: payload }));
  };

  const handleWizardSave = async (course: StaffEventCoursePayload) => {
    const result = await handleSaveCourse(course);
    if (result && updateEventCourse.fulfilled.match(result)) {
      setCourseWizardOpen(false);
    }
  };

  const handleCreateDiscount = async (draft: StaffDiscountCodeInput) => {
    if (!eventId || !role || !draft.code.trim()) return false;
    const result = await dispatch(
      createDiscountCode({ eventId, role: staffRole, body: draft }),
    );
    return createDiscountCode.fulfilled.match(result);
  };

  const handleSaveFolioSegments = (segments: StaffFolioSegmentInput[]) => {
    if (!eventId || !role) return;
    dispatch(updateFolioSegments({ eventId, role: staffRole, segments })).then((result) => {
      if (updateFolioSegments.fulfilled.match(result)) {
        toast({ title: t("staffPortal.folioSegments.save") });
      }
    });
  };

  if (isNew) {
    // Create flow lives on EventCreateWizard (`/staff/events/new`).
    return <Navigate to="/staff/events/new" replace />;
  }

  const documentTitle =
    event?.title ?? t("staffPortal.eventEdit.editTitle");
  const pageTitle =
    tab === "overview"
      ? t("staffPortal.eventEdit.tabOverview")
      : t(`staffPortal.eventSetup.cards.${tab}.title`, {
          defaultValue: t("staffPortal.eventEdit.editTitle"),
        });

  if (organizerAccessDenied) {
    return <Navigate to="/staff/events" replace />;
  }

  const awaitingEventLoad =
    !isNew && !eventDetailError && (loadingEventDetail || eventDetail?.event?.id !== eventId);

  if (awaitingEventLoad) {
    return (
      <StaffPageSkeleton variant="form" className="max-w-[1280px] px-4 py-6" />
    );
  }

  const publishActions = (
    <>
      {showAdminPublish ? (
        <Button
          size="sm"
          className="btn-primary shrink-0"
          disabled={publishingEvent || publishBlocked}
          onClick={() => setPublishPreviewOpen(true)}
        >
          {publishingEvent || loadingPayoutGate ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Rocket className="w-4 h-4 mr-2" />
          )}
          {loadingPayoutGate ? t("staffPortal.payouts.loading") : publishActionLabel}
        </Button>
      ) : null}
      {showOrganizerSubmit ? (
        <Button
          size="sm"
          className="btn-primary shrink-0"
          disabled={publishingEvent || publishBlocked}
          onClick={() => setPublishPreviewOpen(true)}
        >
          {publishingEvent || loadingPayoutGate ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Rocket className="w-4 h-4 mr-2" />
          )}
          {loadingPayoutGate ? t("staffPortal.payouts.loading") : publishActionLabel}
        </Button>
      ) : null}
      {isAdmin && eventStatus === "pending_approval" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
          disabled={rejectingEventApproval}
          onClick={() => void handleRejectApproval()}
        >
          {rejectingEventApproval ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {t("staffPortal.eventEdit.rejectApproval")}
        </Button>
      ) : null}
    </>
  );

  const subdomainLive =
    event?.status === "published" || event?.status === "completed";

  const headerBlock = (
    <>
      <MetaHelmet title={documentTitle} description={t("staffPortal.eventEdit.subtitle")} />
      {inEventConsole ? (
        <EventConsoleSectionHeader
          title={pageTitle}
          badge={event ? <StaffStatusBadge status={event.status} /> : undefined}
          subdomain={event?.subdomain}
          subdomainLive={subdomainLive}
          status={unsavedStatus}
          actions={publishActions}
        />
      ) : (
        <StaffPageHeader
          back={
            tab === "overview"
              ? {
                  to: "/staff/events",
                  label: t("staffPortal.eventEdit.back"),
                  guardedNavigate: requestNavigation,
                }
              : {
                  to: eventId ? eventSetupPath(eventId) : "/staff/events",
                  label: t("staffPortal.eventEdit.overview.backToOverview"),
                  guardedNavigate: requestNavigation,
                }
          }
          title={pageTitle}
          badge={event ? <StaffStatusBadge status={event.status} /> : undefined}
          subtitle={
            tab === "overview"
              ? t("staffPortal.eventEdit.overview.subtitle")
              : t(`staffPortal.eventSetup.cards.${tab}.body`, {
                  defaultValue: t("staffPortal.eventEdit.subtitle"),
                })
          }
          status={unsavedStatus}
          trailing={
            event?.subdomain ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 w-full">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t("staffPortal.eventSetup.subdomainLabel")}
                  </p>
                  <p className="text-sm font-semibold font-mono truncate">
                    {`${event.subdomain}.${resolveApexHostname()}`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground sm:text-right sm:max-w-xs shrink-0">
                  {subdomainLive
                    ? t("staffPortal.eventSetup.subdomainLiveHint")
                    : t("staffPortal.eventSetup.subdomainDraftHint")}
                </p>
              </div>
            ) : undefined
          }
          actions={
            <>
              {publishActions}
              {!isNew && eventId ? (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to={`/staff/events/${eventId}`}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {t("staffPortal.events.manage")}
                  </Link>
                </Button>
              ) : null}
              {!isNew && isOrganizer && eventId ? (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link to={`/staff/events/${eventId}/results`}>
                    <Trophy className="w-4 h-4 mr-2" />
                    {t("staffPortal.results.manage")}
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />
      )}
    </>
  );

  const alertsBlock = (
    <>
      <PortalErrorAlert
        error={eventDetailError || saveEventError || publishError}
        onRetry={() => {
          if (!isNew && eventId && role) {
            dispatch(fetchStaffEventDetail({ eventId, role }));
          }
        }}
      />
      {loadingPayoutGate ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {t("staffPortal.eventEdit.payoutGateLoading")}
        </div>
      ) : null}
      {showPendingBanner ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          {isAdmin
            ? t("staffPortal.eventEdit.pendingApprovalBannerAdmin")
            : t("staffPortal.eventEdit.pendingApprovalBannerOrganizer")}
        </div>
      ) : null}
      {showRejectionBanner ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground space-y-1">
          <p className="font-medium text-destructive">
            {t("staffPortal.eventEdit.rejectionBannerTitle")}
          </p>
          <p className="text-muted-foreground">
            {t("staffPortal.eventEdit.rejectionBannerBody", { reason: rejectionReason })}
          </p>
        </div>
      ) : null}
      {showPayoutBlockedBanner ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-destructive">
            {isAdmin
              ? t("staffPortal.payouts.publishBlockedBannerAdmin")
              : t("staffPortal.payouts.publishBlockedBanner")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40 shrink-0"
            onClick={() =>
              requestNavigation(() =>
                navigate(staffPayoutSetupPath(isAdmin, event?.organizer_id)),
              )
            }
          >
            {isAdmin
              ? t("staffPortal.payouts.publishBlockedCtaAdmin")
              : t("staffPortal.payouts.publishBlockedCta")}
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <EventEditorLayout
      header={headerBlock}
      alerts={alertsBlock}
      navMobile={
        inEventConsole ? undefined : (
          <EventEditGuidedNav {...guidedNavProps} variant="mobile" />
        )
      }
      navDesktop={
        inEventConsole ? undefined : (
          <EventEditGuidedNav {...guidedNavProps} variant="desktop" />
        )
      }
      preview={editPreview}
      showPreview={!inEventConsole || tab !== "overview"}
    >
      <EventPublishPreviewDialog
        open={publishPreviewOpen}
        onOpenChange={setPublishPreviewOpen}
        event={event}
        categories={eventDetail?.categories ?? []}
        feePresentation={effectiveFeePresentation}
        serviceFeePercent={staffServiceFeePercent}
        sponsors={sponsorDrafts}
        courseDistanceKm={courseDraft?.distanceKm}
        waiverCount={activeWaivers.length}
        requiresWaiver={formik.values.requires_waiver}
        confirming={publishingEvent}
        payoutBlocked={payoutPublishBlocked}
        payoutBlockedMessage={
          loadingPayoutGate
            ? t("staffPortal.eventEdit.payoutGateLoading")
            : isAdmin
              ? t("staffPortal.payouts.publishBlockedBannerAdmin")
              : t("staffPortal.payouts.publishBlockedBanner")
        }
        confirmLabel={
          isAdmin
            ? t("staffPortal.eventEdit.preview.confirmPublish")
            : t("staffPortal.eventEdit.preview.confirmSubmitApproval")
        }
        onConfirm={() => void handlePublish()}
      />

      <Tabs value={tab} onValueChange={guardedTabChange} className="w-full">
        <TabsContent value="overview" className="mt-0" forceMount>
          {event ? (
            <EventEditOverview
              event={event}
              categories={eventDetail?.categories ?? []}
              readiness={publishReadiness}
              hasPaidCategories={hasPaidCategories}
              progressPct={setupProgressPct}
              requiredDone={setupRequiredDone}
              publishingEvent={publishingEvent}
              canEdit={canEditEvents}
              publishLabel={publishActionLabel}
              onNavigate={guardedTabChange}
              onPublish={() => setPublishPreviewOpen(true)}
              onPayoutSetup={handlePayoutSetupNavigate}
              onSiteLegalSetup={() =>
                requestNavigation(() => navigate("/staff/legal"))
              }
              onOpenOpsHub={handleOpenOpsHub}
            />
          ) : null}
        </TabsContent>

          {editorHydrated
            ? EVENT_EDIT_DETAIL_SECTIONS.filter((section) =>
                visibleEditTabs.has(section),
              ).map((section) => (
            <TabsContent key={section} value={section} className="mt-0" forceMount>
              <EventEditDetailsForm
                key={`details-${section}-${sectionRemountKey}`}
                section={section}
                formik={formik}
                t={t}
                sportTypes={sportTypes}
                isAdmin={isAdmin}
                isNew={isNew}
                endDateBeforeStart={endDateBeforeStart}
                checkInAutoWindowHint={checkInAutoWindowHint}
                checkInCapHint={checkInCapHint}
                citySelectionIncomplete={citySelectionIncomplete}
                geoStateId={geoStateId}
                geoCityId={geoCityId}
                geoLegacySearchResolved={geoLegacySearchResolved}
                setGeoStateId={setGeoStateId}
                setGeoCityId={setGeoCityId}
                setGeoLegacySearchResolved={setGeoLegacySearchResolved}
                geoUserTouchedRef={geoUserTouchedRef}
                onGeoUserTouched={markGeoDirty}
                effectiveFeePresentation={effectiveFeePresentation}
                eventOrganizerStripeReady={Boolean(eventOrganizerStripeReady)}
                onFeePresentationChange={handleFeePresentationChange}
                heroPreviewUrl={heroPreviewUrl}
                bannerPreviewUrl={bannerPreviewUrl}
                onHeroSelectFile={(file) => {
                  if (heroPreviewUrl?.startsWith("blob:")) revokeBlobUrl(heroPreviewUrl);
                  setHeroPendingFile(file);
                  setHeroPreviewUrl(createBlobPreviewUrl(file));
                }}
                onHeroClear={() => {
                  if (heroPreviewUrl?.startsWith("blob:")) revokeBlobUrl(heroPreviewUrl);
                  setHeroPendingFile(null);
                  setHeroPreviewUrl(null);
                  void formik.setFieldValue("hero_image_url", "");
                }}
                onBannerSelectFile={(file) => {
                  if (bannerPreviewUrl?.startsWith("blob:"))
                    revokeBlobUrl(bannerPreviewUrl);
                  setBannerPendingFile(file);
                  setBannerPreviewUrl(createBlobPreviewUrl(file));
                }}
                onBannerClear={() => {
                  if (bannerPreviewUrl?.startsWith("blob:"))
                    revokeBlobUrl(bannerPreviewUrl);
                  setBannerPendingFile(null);
                  setBannerPreviewUrl(null);
                  void formik.setFieldValue("banner_image_url", "");
                }}
                descriptionEditorRef={descriptionEditorRef}
                descriptionHtmlRef={descriptionHtmlRef}
                stageDescriptionImage={stageDescriptionImage}
                eventDetailsMissing={eventDetailsMissing}
                savingEvent={savingEvent}
                uploadingAssets={uploadingAssets}
              />
            </TabsContent>
          ))
            : null}

          {!isNew ? (
            <TabsContent value="categories" className="mt-0 space-y-4" forceMount>
              {eventId ? (
                <StaffEventCategoriesSection
                  key={`categories-${sectionRemountKey}`}
                  eventId={eventId}
                  categories={eventDetail?.categories ?? []}
                  canManage={canManageCategories}
                  staffRole={staffRole}
                  feePresentation={effectiveFeePresentation}
                  serviceFeePercent={staffServiceFeePercent}
                  onDirtyChange={reportCategoriesDirty}
                />
              ) : null}
            </TabsContent>
          ) : null}

          {!isNew && canManageCategories ? (
            <TabsContent value="extras" className="mt-0 space-y-4" forceMount>
              {eventId ? (
                <StaffEventExtrasSection
                  key={`extras-${sectionRemountKey}`}
                  eventId={eventId}
                  extras={eventDetail?.extras ?? []}
                  categories={eventDetail?.categories ?? []}
                  canManage={canManageCategories}
                  staffRole={staffRole}
                  onDirtyChange={reportExtrasDirty}
                />
              ) : null}
            </TabsContent>
          ) : null}

          {canManageSponsors ? (
            <TabsContent value="sponsors" className="mt-0 space-y-4" forceMount>
              <EventEditSponsorsSection
                key={`sponsors-${sectionRemountKey}`}
                initialSponsors={sponsorDrafts}
                sponsorPendingRef={sponsorPendingRef}
                sponsorsError={sponsorsError}
                savingSponsors={savingSponsors}
                uploadingAssets={uploadingAssets}
                isAdmin={isAdmin}
                onSave={handleSaveSponsors}
                createBlobPreviewUrl={createBlobPreviewUrl}
                t={t}
                onDirtyChange={reportSponsorsDirty}
              />
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="fields" className="mt-0 space-y-4" forceMount>
              <EventEditFieldsSection
                key={`fields-${sectionRemountKey}`}
                eventId={eventId}
                initialFields={fieldDrafts}
                categories={eventDetail?.categories ?? []}
                fieldsError={fieldsError}
                savingFields={savingFields}
                onSave={handleSaveFields}
                t={t}
                onDirtyChange={reportFieldsDirty}
              />
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="waiver" className="mt-0 space-y-4" forceMount>
              {eventId ? (
                <StaffEventWaiversSection
                  key={`waivers-${sectionRemountKey}`}
                  eventId={eventId}
                  waivers={eventWaivers}
                  canManage={canManageCategories}
                  staffRole={staffRole}
                  isAdmin={isAdmin}
                  categories={(eventDetail?.categories ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  onDirtyChange={reportWaiversDirty}
                />
              ) : null}
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="waves" className="mt-0 space-y-4" forceMount>
              <EventEditWavesSection
                key={`waves-${sectionRemountKey}`}
                initialWaves={waveDrafts}
                categories={eventDetail?.categories ?? []}
                wavesError={wavesError}
                savingWaves={savingWaves}
                onSave={handleSaveWaves}
                t={t}
                onDirtyChange={reportWavesDirty}
              />
            </TabsContent>
          ) : null}

          {canManageEventContent ? (
            <TabsContent value="course" className="mt-0 space-y-4" forceMount>
              <SectionShell
                title={t("staffPortal.eventEdit.courseTitle")}
                hint={t("staffPortal.eventEdit.courseSubtitleVisual")}
              >
                {courseError ? <p className="text-xs text-destructive">{courseError}</p> : null}
                <StaffCourseSummaryCard
                  course={courseDraft}
                  startLat={formik.values.location_lat || event?.location_lat}
                  startLng={formik.values.location_lng || event?.location_lng}
                  onOpenWizard={() => setCourseWizardOpen(true)}
                />
                <StaffCourseWizardDialog
                  open={courseWizardOpen}
                  onOpenChange={setCourseWizardOpen}
                  value={courseDraft}
                  onSave={handleWizardSave}
                  saving={savingCourse}
                  eventLat={formik.values.location_lat || event?.location_lat}
                  eventLng={formik.values.location_lng || event?.location_lng}
                  onEventLocationChange={handleEventLocationFromCourse}
                />
              </SectionShell>
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="discounts" className="mt-0 space-y-4" forceMount>
              <EventEditDiscountsSection
                key={`discounts-${sectionRemountKey}`}
                discountCodes={discountCodes}
                discountCodesError={discountCodesError}
                savingDiscountCode={savingDiscountCode}
                numLocale={numLocale}
                onCreate={handleCreateDiscount}
                onToggleActive={(codeId, isActive) => {
                  if (!eventId) return;
                  void dispatch(
                    updateDiscountCode({
                      eventId,
                      codeId,
                      role: staffRole,
                      patch: { is_active: !isActive },
                    }),
                  );
                }}
                onDelete={(codeId) => {
                  if (!eventId) return;
                  void dispatch(
                    deleteDiscountCode({
                      eventId,
                      codeId,
                      role: staffRole,
                    }),
                  );
                }}
                t={t}
                onDirtyChange={reportDiscountsDirty}
              />
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="folios" className="mt-0 space-y-4" forceMount>
              <StaffEventBibModePicker
                groupName="event-bib-mode-folios"
                value={formik.values.bib_mode}
                onChange={(mode) => formik.setFieldValue("bib_mode", mode)}
                t={t}
                strongFolioNote
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1">
                <p className="text-xs text-muted-foreground flex-1">
                  {t("staffPortal.eventEdit.bibMode.saveWithDetails")}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    savingEvent ||
                    uploadingAssets ||
                    sportTypes.length === 0 ||
                    formik.values.sport_type_id <= 0
                  }
                  onClick={() => void formik.submitForm()}
                >
                  {savingEvent || uploadingAssets ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t("staffPortal.eventEdit.bibMode.savePolicy")}
                </Button>
              </div>
              <StaffEventFolioSegmentsSection
                key={`folios-${sectionRemountKey}`}
                eventId={eventId}
                segments={folioSegments}
                categories={eventDetail?.categories ?? []}
                discountCodes={discountCodes}
                saving={savingFolioSegments}
                error={folioSegmentsError}
                onSave={handleSaveFolioSegments}
                t={t}
                onDirtyChange={reportFoliosDirty}
              />
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="waitlist" className="mt-0 space-y-4" forceMount>
              <EventEditWaitlistSection
                waitlistEntries={waitlistEntries}
                waitlistError={waitlistError}
                loadingWaitlist={loadingWaitlist}
                offeringWaitlist={offeringWaitlist}
                onOffer={(waitlistEntryId) => {
                  if (!eventId) return;
                  void dispatch(
                    offerWaitlistSpot({
                      eventId,
                      role: staffRole,
                      waitlistEntryId,
                    }),
                  );
                }}
                onRevoke={(waitlistEntryId) => {
                  if (!eventId) return;
                  void dispatch(
                    revokeWaitlistEntry({
                      eventId,
                      role: staffRole,
                      waitlistEntryId,
                    }),
                  );
                }}
                t={t}
              />
            </TabsContent>
          ) : null}

          {canManageCategories ? (
            <TabsContent value="media" className="mt-0 space-y-4" forceMount>
              <EventEditMediaSection
                key={`media-${sectionRemountKey}`}
                initialMedia={mediaDrafts}
                mediaPendingRef={mediaPendingRef}
                eventMediaError={eventMediaError}
                loadingEventMedia={loadingEventMedia}
                savingEventMedia={savingEventMedia}
                uploadingAssets={uploadingAssets}
                isAdmin={isAdmin}
                eventId={eventId}
                onSave={handleSaveMedia}
                createBlobPreviewUrl={createBlobPreviewUrl}
                revokeBlobUrl={revokeBlobUrl}
                t={t}
                onDirtyChange={reportMediaDirty}
              />
            </TabsContent>
          ) : null}
      </Tabs>
      <EventEditDiscardDialog
        open={dialogOpen}
        intent={discardIntent}
        onConfirm={handleConfirmDiscard}
        onCancel={cancelDiscard}
      />
    </EventEditorLayout>
  );
}

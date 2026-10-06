import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveApexHostname } from "@/utils/hostContext";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Sparkles } from "lucide-react";
import MetaHelmet from "@/components/MetaHelmet";
import GeoCitySelector from "@/components/geo/GeoCitySelector";
import EventSubdomainPicker, {
  isEventSubdomainFormatValid,
  isEventSubdomainLiveAvailable,
  type EventSubdomainAvailabilityState,
} from "@/components/staff/EventSubdomainPicker";
import EventCreateStepCustomize, {
  type CustomizeBlockId,
} from "@/components/staff/event-create/EventCreateStepCustomize";
import EventCreateStepOrganizer from "@/components/staff/event-create/EventCreateStepOrganizer";
import EventCreateStepPublish from "@/components/staff/event-create/EventCreateStepPublish";
import EventCreateStepTickets from "@/components/staff/event-create/EventCreateStepTickets";
import EventCreateWizardLayout from "@/components/staff/event-create/EventCreateWizardLayout";
import {
  eventCreateWizardSteps,
  parseEventCreateWizardStep,
  type EventCreatePreviewData,
  type EventCreateWizardStep,
} from "@/components/staff/event-create/types";
import { StaffPageSkeleton } from "@/components/staff/skeletons/StaffSkeletons";
import { Button } from "@/components/ui/button";
import DateTimePickerField from "@/components/ui/datetime-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadEventAssetToCdn } from "@/lib/cdn-upload";
import { revokeBlobUrl } from "@/lib/pendingMediaImages";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSportTypes } from "@/store/slices/marketplaceSlice";
import {
  addEventCategory,
  createAdminEvent,
  createOrganizerEvent,
  fetchAdminOrganizerConnect,
  fetchAdminOrganizers,
  fetchEventCourse,
  fetchEventMedia,
  fetchEventWaivers,
  fetchOrganizerOnboardingIntake,
  fetchOrganizerPayoutStatus,
  fetchStaffEventDetail,
  publishStaffEvent,
  updateEventMedia,
  updateStaffEvent,
} from "@/store/slices/staffPortalSlice";
import {
  buildGalleryMediaPayload,
  galleryItemsFromEvent,
  previewHeroAndMediaFromGallery,
  stripGalleryMedia,
  type EventCreateGalleryItem,
} from "@/utils/eventCreateGallery";
import { fromDatetimeLocal, toDatetimeLocal } from "@/utils/datetimeLocal";
import {
  buildDevEventCreateFillValues,
  buildDevTicketCategoryBodies,
  createDevGalleryItem,
  DEV_EVENT_SHORT_DESCRIPTION,
  pickDevGeoCity,
  pickDevGeoState,
} from "@/utils/eventCreateDevFill";
import { isCatalogCitySelectionValid } from "@/utils/geoCityValidation";
import { eventAdvancedEditPath } from "@/utils/eventSetupSections";
import { prepareEventImageFile } from "@/utils/eventImageUpload";
import { canOrganizerCreateEvents } from "@/utils/staffNav";
import {
  isStaleTitleYearAutoSubdomain,
  primaryEventSubdomainFromTitle,
} from "@shared/eventSubdomain";
import type { AdminOrganizerRow, StaffEventUpsertRequest, StaffRole } from "@shared/api";
import { fetchGeoCities, fetchGeoStates } from "@/store/slices/geoSlice";

function roughDateToStartLocal(rough: string | null | undefined): string {
  if (!rough?.trim()) return "";
  const raw = rough.trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return toDatetimeLocal(`${raw}-01T08:00:00`);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return toDatetimeLocal(`${raw.slice(0, 10)}T08:00:00`);
  }
  return "";
}

function eventToFormValues(event: {
  title: string;
  subdomain?: string | null;
  sport_type_id: number;
  start_date: string;
  end_date?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_name?: string | null;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  short_description?: string | null;
}) {
  return {
    title: event.title ?? "",
    subdomain: event.subdomain ?? "",
    sport_type_id: String(event.sport_type_id ?? ""),
    start_date: event.start_date ? toDatetimeLocal(event.start_date) : "",
    end_date: event.end_date ? toDatetimeLocal(event.end_date) : "",
    location_city: event.location_city ?? "",
    location_state: event.location_state ?? "",
    location_name: event.location_name ?? "",
    location_lat: event.location_lat != null ? String(event.location_lat) : "",
    location_lng: event.location_lng != null ? String(event.location_lng) : "",
    short_description: event.short_description ?? "",
  };
}

export default function EventCreateWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { eventId: eventIdParam } = useParams<{ eventId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const routeEventId = eventIdParam ? Number(eventIdParam) : null;
  const hasRouteEvent = routeEventId != null && Number.isFinite(routeEventId);

  const { role, user } = useAppSelector((s) => s.staffAuth);
  const { sportTypes } = useAppSelector((s) => s.marketplace);
  const {
    savingEvent,
    saveEventError,
    eventDetail,
    loadingEventDetail,
    eventDetailError,
    eventWaivers,
    eventCourse,
    payoutStatus,
    loadingPayoutStatus,
    adminOrganizerConnect,
    loadingAdminOrganizerConnect,
    publishingEvent,
    publishError,
    eventMedia,
  } = useAppSelector((s) => s.staffPortal);

  const isAdmin = role === "admin";
  const staffRole: StaffRole = isAdmin ? "admin" : "organizer";
  /** Admin onboarding of an existing draft uses organizer-length steps (no org picker). */
  const wizardSteps = eventCreateWizardSteps(isAdmin && !hasRouteEvent);
  const step = parseEventCreateWizardStep(searchParams.get("step"), wizardSteps);

  const [geoStateId, setGeoStateId] = useState<number | null>(null);
  const [geoCityId, setGeoCityId] = useState<number | null>(null);
  const [intakeReady, setIntakeReady] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganizerRow | null>(null);
  const [subdomainAvail, setSubdomainAvail] =
    useState<EventSubdomainAvailabilityState>({
      status: "idle",
      subdomain: "",
    });
  const autoSubdomainRef = useRef<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [galleryItems, setGalleryItems] = useState<EventCreateGalleryItem[]>([]);
  const [galleryHydrated, setGalleryHydrated] = useState(false);
  const [skippedBlocks, setSkippedBlocks] = useState<Set<CustomizeBlockId>>(
    new Set(),
  );
  const [eventHydrated, setEventHydrated] = useState(!hasRouteEvent);
  const [stepBusy, setStepBusy] = useState(false);
  const [fillTestBusy, setFillTestBusy] = useState(false);

  const canCreate =
    role === "organizer" &&
    user?.type === "organizer" &&
    canOrganizerCreateEvents(user.role);

  const event = eventDetail?.event;
  const categories = eventDetail?.categories ?? [];
  const activeEventId = hasRouteEvent ? routeEventId : event?.id ?? null;

  const goToStep = useCallback(
    (next: EventCreateWizardStep, replace = false) => {
      const preCreateOk = next === "info" || next === "organizer";
      if (!activeEventId && !preCreateOk) return;
      if (activeEventId) {
        const path = `/staff/events/${activeEventId}/onboarding`;
        const onboardingStep = next === "organizer" ? "info" : next;
        const onboardingQs =
          onboardingStep === "info" ? "" : `?step=${onboardingStep}`;
        navigate(`${path}${onboardingQs}`, { replace });
        return;
      }
      if (!preCreateOk) return;
      if (next === wizardSteps[0]) {
        setSearchParams({}, { replace });
      } else {
        setSearchParams({ step: next }, { replace });
      }
    },
    [activeEventId, navigate, setSearchParams, wizardSteps],
  );

  useEffect(() => {
    setEventHydrated(!hasRouteEvent);
    setGalleryHydrated(false);
    setGalleryItems([]);
  }, [routeEventId, hasRouteEvent]);

  useEffect(() => {
    dispatch(fetchSportTypes());
  }, [dispatch]);

  useEffect(() => {
    if (!hasRouteEvent || !routeEventId) return;
    dispatch(fetchStaffEventDetail({ eventId: routeEventId, role: staffRole }));
    dispatch(fetchEventWaivers({ eventId: routeEventId, role: staffRole }));
    dispatch(fetchEventCourse({ eventId: routeEventId, role: staffRole }));
    dispatch(fetchEventMedia({ eventId: routeEventId, role: staffRole }));
    if (role === "organizer") {
      dispatch(fetchOrganizerPayoutStatus());
    }
  }, [dispatch, hasRouteEvent, routeEventId, staffRole, role]);

  useEffect(() => {
    if (role !== "admin" || !event?.organizer_id) return;
    void dispatch(fetchAdminOrganizerConnect({ organizerId: event.organizer_id }));
  }, [dispatch, role, event?.organizer_id]);

  const form = useFormik({
    initialValues: {
      title: "",
      subdomain: "",
      sport_type_id: "",
      start_date: "",
      end_date: "",
      location_city: "",
      location_state: "",
      location_name: "",
      location_lat: "",
      location_lng: "",
      short_description: "",
    },
    enableReinitialize: false,
    validateOnBlur: false,
    validateOnChange: false,
    validationSchema: Yup.object({
      title: Yup.string().trim().required(t("common.required")),
      subdomain: Yup.string()
        .trim()
        .required(t("common.required"))
        .test(
          "subdomain-format",
          t("staffPortal.eventCreate.subdomain.errors.invalid_chars"),
          (v) => isEventSubdomainFormatValid(v ?? ""),
        ),
      sport_type_id: Yup.string().required(t("common.required")),
      start_date: Yup.string().required(t("common.required")),
      location_city: Yup.string().trim(),
      location_state: Yup.string().trim(),
      location_name: Yup.string().trim(),
      short_description: Yup.string().trim(),
    }),
    onSubmit: () => undefined,
  });

  useEffect(() => {
    if (!event || eventHydrated) return;
    const values = eventToFormValues(event);
    void form.setValues(values);
    setEventHydrated(true);
    if (event.subdomain) {
      autoSubdomainRef.current = event.subdomain;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per event load
  }, [event, eventHydrated]);

  useEffect(() => {
    if (!event || !eventHydrated || galleryHydrated) return;
    setGalleryItems(galleryItemsFromEvent(event.hero_image_url, eventMedia));
    setGalleryHydrated(true);
  }, [event, eventMedia, eventHydrated, galleryHydrated]);

  useEffect(() => {
    if (hasRouteEvent) return;
    const primary = primaryEventSubdomainFromTitle(form.values.title);
    const current = form.values.subdomain;
    const stillAuto =
      !current ||
      autoSubdomainRef.current === current ||
      isStaleTitleYearAutoSubdomain(current, form.values.title);

    if (!stillAuto) return;

    if (!primary) {
      if (current) {
        autoSubdomainRef.current = null;
        void form.setFieldValue("subdomain", "");
      }
      return;
    }

    if (current !== primary) {
      autoSubdomainRef.current = primary;
      void form.setFieldValue("subdomain", primary);
    } else {
      autoSubdomainRef.current = primary;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from title only
  }, [form.values.title, hasRouteEvent]);

  useEffect(() => {
    if (role !== "organizer" || intakeReady || hasRouteEvent) return;
    void dispatch(fetchOrganizerOnboardingIntake()).then((result) => {
      setIntakeReady(true);
      if (!fetchOrganizerOnboardingIntake.fulfilled.match(result)) return;
      const intake = result.payload;
      if (!intake) return;
      if (intake.event_name?.trim() && !form.values.title) {
        void form.setFieldValue("title", intake.event_name.trim());
      }
      if (intake.sport_type_id != null && !form.values.sport_type_id) {
        void form.setFieldValue("sport_type_id", String(intake.sport_type_id));
      }
      const start = roughDateToStartLocal(intake.rough_date);
      if (start && !form.values.start_date) {
        void form.setFieldValue("start_date", start);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot prefill
  }, [dispatch, role, intakeReady, hasRouteEvent]);

  useEffect(() => {
    if (sportTypes.length > 0 && !form.values.sport_type_id && intakeReady) {
      void form.setFieldValue("sport_type_id", String(sportTypes[0].id));
    }
  }, [sportTypes, intakeReady, form.values.sport_type_id, form]);

  useEffect(() => {
    if (!autoSaved) return;
    const timer = window.setTimeout(() => setAutoSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [autoSaved]);

  const sportName = useMemo(() => {
    const id = Number(form.values.sport_type_id);
    const st = sportTypes.find((s) => s.id === id);
    return st?.name;
  }, [form.values.sport_type_id, sportTypes]);

  const sportSlug = useMemo(() => {
    const id = Number(form.values.sport_type_id);
    return sportTypes.find((s) => s.id === id)?.slug;
  }, [form.values.sport_type_id, sportTypes]);

  const organizerPreview = useMemo(() => {
    if (selectedOrg) {
      return { name: selectedOrg.name, logo: null as string | null };
    }
    if (user?.type === "organizer") {
      return {
        name: user.organizerName ?? `${user.firstName} ${user.lastName}`.trim(),
        logo: user.avatarUrl ?? null,
      };
    }
    return {
      name: event?.organizer_name ?? undefined,
      logo: null as string | null,
    };
  }, [selectedOrg, user, event?.organizer_name]);

  const previewGallery = useMemo(
    () =>
      skippedBlocks.has("hero")
        ? { heroUrl: null as string | null, media: undefined }
        : previewHeroAndMediaFromGallery(galleryItems),
    [galleryItems, skippedBlocks],
  );

  const preview: EventCreatePreviewData = useMemo(
    () => ({
      title: form.values.title,
      sportName,
      sportSlug,
      startDate: form.values.start_date
        ? fromDatetimeLocal(form.values.start_date) ?? form.values.start_date
        : event?.start_date,
      endDate: form.values.end_date
        ? fromDatetimeLocal(form.values.end_date) ?? form.values.end_date
        : event?.end_date ?? undefined,
      locationCity: form.values.location_city || event?.location_city || undefined,
      locationState:
        form.values.location_state || event?.location_state || undefined,
      locationName: form.values.location_name || event?.location_name || undefined,
      locationCountry: event?.location_country ?? "MX",
      locationLat: form.values.location_lat || event?.location_lat || undefined,
      locationLng: form.values.location_lng || event?.location_lng || undefined,
      heroUrl: previewGallery.heroUrl,
      bannerUrl: event?.banner_image_url ?? null,
      media: previewGallery.media,
      shortDescription:
        skippedBlocks.has("shortDescription")
          ? undefined
          : form.values.short_description.trim() || undefined,
      description: event?.description?.trim() || undefined,
      subdomain: form.values.subdomain || event?.subdomain || undefined,
      organizerName: organizerPreview.name,
      organizerLogo: organizerPreview.logo,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        price_cents: c.price_cents,
        distance_km: c.distance_km ?? undefined,
        description: c.description ?? undefined,
      })),
    }),
    [
      form.values,
      sportName,
      sportSlug,
      event,
      previewGallery,
      skippedBlocks,
      galleryItems,
      categories,
      organizerPreview,
    ],
  );

  const buildUpsertBody = (): StaffEventUpsertRequest => ({
    title: form.values.title.trim(),
    subdomain: form.values.subdomain.trim(),
    sport_type_id: Number(form.values.sport_type_id),
    start_date: fromDatetimeLocal(form.values.start_date) ?? form.values.start_date,
    end_date: form.values.end_date
      ? fromDatetimeLocal(form.values.end_date)
      : null,
    location_city: form.values.location_city.trim(),
    location_state: form.values.location_state.trim() || null,
    location_name: form.values.location_name.trim() || null,
    location_lat: form.values.location_lat ? Number(form.values.location_lat) : null,
    location_lng: form.values.location_lng ? Number(form.values.location_lng) : null,
    short_description: skippedBlocks.has("shortDescription")
      ? null
      : form.values.short_description.trim() || null,
    status: "draft",
    visibility: "public",
    featured: false,
    requires_waiver: false,
    auto_deactivate_after_event: true,
  });

  const fillDevInfoStep = useCallback(async () => {
    const fill = buildDevEventCreateFillValues({ sportTypes });
    // Keep subdomain as an explicit override so title→auto-subdomain sync does not clobber it.
    autoSubdomainRef.current = null;
    await form.setValues({
      ...form.values,
      title: fill.title,
      subdomain: fill.subdomain,
      sport_type_id: fill.sport_type_id || form.values.sport_type_id,
      start_date: fill.start_date,
      end_date: fill.end_date,
      location_name: fill.location_name,
      short_description: fill.short_description,
    });
    void form.setErrors({});

    try {
      const statesResult = await dispatch(fetchGeoStates("MX"));
      const states = fetchGeoStates.fulfilled.match(statesResult)
        ? statesResult.payload
        : [];
      const state = pickDevGeoState(states);
      if (!state) return;

      const citiesResult = await dispatch(
        fetchGeoCities({ stateId: state.id, country: "MX" }),
      );
      const cities = fetchGeoCities.fulfilled.match(citiesResult)
        ? citiesResult.payload.cities
        : [];
      const city = pickDevGeoCity(cities);
      if (!city) {
        setGeoStateId(state.id);
        setGeoCityId(null);
        void form.setFieldValue("location_state", state.name);
        return;
      }

      setGeoStateId(state.id);
      setGeoCityId(city.id);
      void form.setFieldValue("location_city", city.name);
      void form.setFieldValue("location_state", city.state_name || state.name);
      if (city.lat != null) {
        void form.setFieldValue("location_lat", String(city.lat));
      }
      if (city.lng != null) {
        void form.setFieldValue("location_lng", String(city.lng));
      }
    } catch {
      // Dev helper only — leave location empty if catalog fetch fails.
    }
  }, [dispatch, form, sportTypes]);

  const fillDevTicketsStep = useCallback(async () => {
    if (!activeEventId || categories.length > 0) return;
    for (const body of buildDevTicketCategoryBodies()) {
      const result = await dispatch(
        addEventCategory({ eventId: activeEventId, role: staffRole, body }),
      );
      if (!addEventCategory.fulfilled.match(result)) break;
    }
    setAutoSaved(true);
  }, [activeEventId, categories.length, dispatch, staffRole]);

  const fillDevCustomizeStep = useCallback(async () => {
    setSkippedBlocks(new Set());
    if (!form.values.short_description.trim()) {
      void form.setFieldValue("short_description", DEV_EVENT_SHORT_DESCRIPTION);
    }
    if (galleryItems.length === 0) {
      try {
        const item = await createDevGalleryItem();
        setGalleryItems([item]);
      } catch {
        // Preview image is optional for local flow testing.
      }
    }
  }, [form, galleryItems.length]);

  const fillDevTestEventData = useCallback(async () => {
    if (!import.meta.env.DEV || fillTestBusy) return;
    setFillTestBusy(true);
    try {
      if (step === "organizer") {
        if (!selectedOrg) {
          const result = await dispatch(fetchAdminOrganizers({}));
          if (fetchAdminOrganizers.fulfilled.match(result) && result.payload[0]) {
            setSelectedOrg(result.payload[0]);
          }
        }
        return;
      }

      if (step === "info") {
        await fillDevInfoStep();
        return;
      }

      if (step === "tickets") {
        await fillDevTicketsStep();
        return;
      }

      if (step === "customize") {
        await fillDevCustomizeStep();
        return;
      }

      if (step === "publish") {
        // Close gaps so the publish checklist can go green without retyping earlier steps.
        if (categories.length === 0) await fillDevTicketsStep();
        await fillDevCustomizeStep();
      }
    } finally {
      setFillTestBusy(false);
    }
  }, [
    categories.length,
    dispatch,
    fillDevCustomizeStep,
    fillDevInfoStep,
    fillDevTicketsStep,
    fillTestBusy,
    selectedOrg,
    step,
  ]);

  const validateInfoStep = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!form.values.title.trim()) nextErrors.title = t("common.required");
    if (!form.values.sport_type_id) nextErrors.sport_type_id = t("common.required");
    if (!form.values.start_date) nextErrors.start_date = t("common.required");
    if (!form.values.subdomain.trim()) {
      nextErrors.subdomain = t("common.required");
    } else if (!isEventSubdomainFormatValid(form.values.subdomain)) {
      nextErrors.subdomain = t(
        "staffPortal.eventCreate.subdomain.errors.invalid_chars",
      );
    } else if (
      !hasRouteEvent &&
      !isEventSubdomainLiveAvailable(form.values.subdomain, subdomainAvail)
    ) {
      nextErrors.subdomain =
        subdomainAvail.status === "checking"
          ? t("staffPortal.eventCreate.subdomain.checking")
          : t("staffPortal.eventCreate.subdomain.errors.taken");
    }
    if (!form.values.location_city.trim()) {
      nextErrors.location_city = t("common.required");
    } else if (!isCatalogCitySelectionValid(geoCityId, form.values.location_city)) {
      nextErrors.location_city = t("staffPortal.eventCreate.errors.invalidCity");
    }
    if (Object.keys(nextErrors).length > 0) {
      form.setErrors(nextErrors);
      form.setTouched({
        title: true,
        sport_type_id: true,
        start_date: true,
        subdomain: true,
        location_city: true,
      });
      return false;
    }
    return true;
  };

  const handleInfoContinue = async () => {
    if (!validateInfoStep()) return;

    const body = buildUpsertBody();

    if (activeEventId) {
      const { subdomain: _sub, ...patchBody } = body;
      const result = await dispatch(
        updateStaffEvent({
          eventId: activeEventId,
          role: staffRole,
          body: patchBody,
        }),
      );
      if (updateStaffEvent.fulfilled.match(result)) {
        setAutoSaved(true);
        goToStep("tickets");
      }
      return;
    }

    if (isAdmin) {
      if (!selectedOrg) {
        goToStep("organizer");
        return;
      }
      const result = await dispatch(
        createAdminEvent({ ...body, organizer_id: selectedOrg.id }),
      );
      if (createAdminEvent.fulfilled.match(result)) {
        const id = result.payload.event?.id;
        if (id) {
          setAutoSaved(true);
          navigate(`/staff/events/${id}/onboarding?step=tickets`, {
            replace: true,
          });
        }
      }
      return;
    }

    const result = await dispatch(createOrganizerEvent(body));
    if (createOrganizerEvent.fulfilled.match(result)) {
      const id = result.payload.event?.id;
      if (id) {
        setAutoSaved(true);
        navigate(`/staff/events/${id}/onboarding?step=tickets`, { replace: true });
      }
    }
  };

  const handleCustomizeContinue = async () => {
    if (!activeEventId) return;
    setStepBusy(true);
    try {
      const { subdomain: _sub, ...patchBase } = buildUpsertBody();
      const patch: StaffEventUpsertRequest = { ...patchBase };

      if (!skippedBlocks.has("hero") && galleryItems.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < galleryItems.length; i++) {
          const item = galleryItems[i];
          if (item.file) {
            const cropRole = galleryItems.length === 1 ? "hero" : "gallery";
            const prepared = await prepareEventImageFile(item.file, cropRole);
            const url = await uploadEventAssetToCdn(
              prepared,
              `event_${activeEventId}_${cropRole}_${i}`,
              false,
              cropRole === "hero" ? "hero" : "image",
            );
            urls.push(url);
            if (item.previewUrl.startsWith("blob:")) revokeBlobUrl(item.previewUrl);
          } else if (item.persistedUrl ?? item.previewUrl) {
            urls.push(item.persistedUrl ?? item.previewUrl);
          }
        }

        if (urls.length === 1) {
          patch.hero_image_url = urls[0];
          const mediaResult = await dispatch(
            updateEventMedia({
              eventId: activeEventId,
              role: staffRole,
              media: stripGalleryMedia(eventMedia),
            }),
          );
          if (!updateEventMedia.fulfilled.match(mediaResult)) return;
        } else if (urls.length > 1) {
          patch.hero_image_url = urls[0];
          const mediaResult = await dispatch(
            updateEventMedia({
              eventId: activeEventId,
              role: staffRole,
              media: [
                ...stripGalleryMedia(eventMedia),
                ...buildGalleryMediaPayload(urls),
              ],
            }),
          );
          if (!updateEventMedia.fulfilled.match(mediaResult)) return;
        }

        setGalleryItems(
          urls.map((url, index) => ({
            id: galleryItems[index]?.id ?? `saved-${index}`,
            previewUrl: url,
            file: null,
            persistedUrl: url,
          })),
        );
      }

      const result = await dispatch(
        updateStaffEvent({ eventId: activeEventId, role: staffRole, body: patch }),
      );
      if (updateStaffEvent.fulfilled.match(result)) {
        setAutoSaved(true);
        goToStep("publish");
      }
    } finally {
      setStepBusy(false);
    }
  };

  const revokeGalleryPreviews = (items: EventCreateGalleryItem[]) => {
    for (const item of items) {
      if (item.previewUrl.startsWith("blob:")) revokeBlobUrl(item.previewUrl);
    }
  };

  const handleGalleryItemsChange = (items: EventCreateGalleryItem[]) => {
    const removed = galleryItems.filter(
      (prev) => !items.some((next) => next.id === prev.id),
    );
    revokeGalleryPreviews(removed);
    setGalleryItems(items);
    setSkippedBlocks((prev) => {
      const next = new Set(prev);
      next.delete("hero");
      return next;
    });
  };

  const handlePublish = async () => {
    if (!activeEventId) return;
    const result = await dispatch(
      publishStaffEvent({ eventId: activeEventId, role: staffRole }),
    );
    if (publishStaffEvent.fulfilled.match(result)) {
      navigate(`/staff/events/${activeEventId}`, { replace: true });
    }
  };

  const handleSkipBlock = (id: CustomizeBlockId) => {
    setSkippedBlocks((prev) => new Set(prev).add(id));
    if (id === "hero") {
      revokeGalleryPreviews(galleryItems);
      setGalleryItems([]);
    }
  };

  const hasPaidCategories = categories.some((c) => c.price_cents > 0);
  const payoutLoading = isAdmin
    ? loadingAdminOrganizerConnect
    : loadingPayoutStatus;
  const payoutReady = hasPaidCategories
    ? payoutLoading
      ? null
      : Boolean(
          isAdmin
            ? adminOrganizerConnect?.payoutReady
            : payoutStatus?.payoutReady,
        )
    : undefined;

  const metaPath = hasRouteEvent
    ? `/staff/events/${routeEventId}/onboarding`
    : "/staff/events/new";

  if (role && role !== "organizer" && role !== "admin") {
    return <Navigate to="/staff" replace />;
  }
  if (role === "organizer" && !canCreate && !hasRouteEvent) {
    return <Navigate to="/staff/events" replace />;
  }

  if (hasRouteEvent && loadingEventDetail && !event) {
    return <StaffPageSkeleton variant="form" className="max-w-6xl px-4 py-6" />;
  }

  if (hasRouteEvent && eventDetailError && !event) {
    return <Navigate to="/staff/events" replace />;
  }

  if (hasRouteEvent && event && step !== "info" && !eventHydrated) {
    return <StaffPageSkeleton variant="form" className="max-w-6xl px-4 py-6" />;
  }

  if (hasRouteEvent && !activeEventId && !loadingEventDetail) {
    return <Navigate to="/staff/events" replace />;
  }

  const stepIndex = wizardSteps.indexOf(step);
  const busy = savingEvent || stepBusy;
  const prevStep = stepIndex > 0 ? wizardSteps[stepIndex - 1] : null;

  const footer = (
    <>
      {prevStep ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 sm:flex-1"
          disabled={busy}
          onClick={() => goToStep(prevStep)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t(`staffPortal.eventCreate.wizardSteps.${prevStep}.backLabel`)}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 sm:flex-1"
          disabled={busy}
          onClick={() => navigate("/staff/events")}
        >
          {t("common.cancel")}
        </Button>
      )}

      {step === "publish" ? null : (
        <Button
          type="button"
          className="h-12 sm:flex-[2]"
          disabled={
            busy || (step === "organizer" && !selectedOrg)
          }
          onClick={() => {
            if (step === "organizer") goToStep("info");
            else if (step === "info") void handleInfoContinue();
            else if (step === "tickets") goToStep("customize");
            else if (step === "customize") void handleCustomizeContinue();
          }}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              {step === "tickets" && categories.length === 0
                ? t("staffPortal.eventCreate.skipTickets")
                : step === "organizer"
                  ? t("staffPortal.eventCreate.continueWithOrganizer")
                  : t("staffPortal.eventCreate.saveAndContinue")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </>
  );

  return (
    <div className="px-0 sm:px-0 pb-4 md:pb-6">
      <MetaHelmet
        title={t("staffPortal.eventCreate.metaTitle")}
        description={t("staffPortal.eventCreate.metaDescription")}
        path={metaPath}
        noindex
      />

      <EventCreateWizardLayout
        step={step}
        steps={wizardSteps}
        preview={preview}
        saving={busy}
        autoSaved={autoSaved}
        footer={footer}
        onFillTestData={() => void fillDevTestEventData()}
        fillTestDataBusy={fillTestBusy}
        title={
          step === wizardSteps[0] && !hasRouteEvent
            ? isAdmin
              ? t("staffPortal.eventCreate.adminTitle")
              : t("staffPortal.eventCreate.title")
            : undefined
        }
        subtitle={
          step === wizardSteps[0] && !hasRouteEvent
            ? isAdmin
              ? t("staffPortal.eventCreate.adminSubtitle")
              : t("staffPortal.eventCreate.subtitle")
            : undefined
        }
      >
        {step === "organizer" ? (
          <EventCreateStepOrganizer
            selectedOrg={selectedOrg}
            onSelect={setSelectedOrg}
          />
        ) : null}

        {step === "info" ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              {!hasRouteEvent ? (
                <div className="rounded-full bg-primary/10 p-2.5 shrink-0 hidden sm:flex">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">
                  {t("staffPortal.eventCreate.wizardSteps.info.formTitle")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("staffPortal.eventCreate.wizardSteps.info.formHint")}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-title">
                {t("staffPortal.eventEdit.fieldTitle")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="create-title"
                className="h-12"
                autoFocus={!hasRouteEvent}
                maxLength={80}
                {...form.getFieldProps("title")}
              />
              {form.touched.title && form.errors.title ? (
                <p className="text-xs text-destructive">{form.errors.title}</p>
              ) : null}
            </div>

            {!hasRouteEvent ? (
              <EventSubdomainPicker
                title={form.values.title}
                startDate={form.values.start_date}
                city={form.values.location_city}
                value={form.values.subdomain}
                onChange={(v) => {
                  if (autoSubdomainRef.current !== v) {
                    autoSubdomainRef.current = null;
                  }
                  void form.setFieldValue("subdomain", v);
                }}
                onAvailabilityChange={setSubdomainAvail}
                error={
                  form.touched.subdomain && form.errors.subdomain
                    ? form.errors.subdomain
                    : null
                }
              />
            ) : event?.subdomain ? (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("staffPortal.eventSetup.subdomainLabel")}
                </p>
                <p className="text-sm font-medium font-mono break-all">
                  {`${event.subdomain}.${resolveApexHostname()}`}
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>
                {t("staffPortal.eventEdit.fieldSport")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select
                value={form.values.sport_type_id || undefined}
                onValueChange={(v) => form.setFieldValue("sport_type_id", v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t("staffPortal.eventEdit.fieldSport")} />
                </SelectTrigger>
                <SelectContent>
                  {sportTypes.map((st) => (
                    <SelectItem key={st.id} value={String(st.id)}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.touched.sport_type_id && form.errors.sport_type_id ? (
                <p className="text-xs text-destructive">{form.errors.sport_type_id}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="create-start">
                  {t("staffPortal.eventEdit.fieldStart")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <DateTimePickerField
                  id="create-start"
                  value={form.values.start_date}
                  onChange={(v) => void form.setFieldValue("start_date", v)}
                  onBlur={() => void form.setFieldTouched("start_date", true)}
                  invalid={Boolean(
                    form.touched.start_date && form.errors.start_date,
                  )}
                  triggerClassName="h-12 rounded-xl pl-10"
                  showIcon
                />
                {form.touched.start_date && form.errors.start_date ? (
                  <p className="text-xs text-destructive">{form.errors.start_date}</p>
                ) : null}
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="create-end">
                  {t("staffPortal.eventCreate.fieldEndOptional")}
                </Label>
                <DateTimePickerField
                  id="create-end"
                  value={form.values.end_date}
                  onChange={(v) => void form.setFieldValue("end_date", v)}
                  onBlur={() => void form.setFieldTouched("end_date", true)}
                  triggerClassName="h-12 rounded-xl pl-10"
                  showIcon
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-border">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t("staffPortal.eventCreate.wizardSteps.info.locationTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("staffPortal.eventCreate.wizardSteps.info.locationHint")}
                </p>
              </div>
              <GeoCitySelector
                stateId={geoStateId}
                cityId={geoCityId}
                cityName={form.values.location_city}
                stateName={form.values.location_state}
                onChange={(sel) => {
                  setGeoStateId(sel.stateId);
                  setGeoCityId(sel.geoCityId);
                  void form.setFieldValue("location_city", sel.city);
                  void form.setFieldValue("location_state", sel.state);
                  if (sel.lat != null) {
                    void form.setFieldValue("location_lat", String(sel.lat));
                  }
                  if (sel.lng != null) {
                    void form.setFieldValue("location_lng", String(sel.lng));
                  }
                }}
                staffRole={staffRole}
              />
              {(form.touched.location_city || form.submitCount > 0) &&
              form.errors.location_city ? (
                <p className="text-xs text-destructive">{form.errors.location_city}</p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="create-venue">
                  {t("staffPortal.eventCreate.fieldVenueOptional")}
                </Label>
                <Input
                  id="create-venue"
                  className="h-12"
                  placeholder={t("staffPortal.eventCreate.venuePlaceholder")}
                  {...form.getFieldProps("location_name")}
                />
              </div>
            </div>

            {saveEventError ? (
              <p className="text-sm text-destructive" role="alert">
                {t(saveEventError, { defaultValue: saveEventError })}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === "tickets" && activeEventId ? (
          <EventCreateStepTickets
            eventId={activeEventId}
            staffRole={staffRole}
            categories={categories}
            onCategoriesChange={() => setAutoSaved(true)}
          />
        ) : null}

        {step === "customize" && activeEventId ? (
          <EventCreateStepCustomize
            eventId={activeEventId}
            shortDescription={form.values.short_description}
            onShortDescriptionChange={(v) => form.setFieldValue("short_description", v)}
            galleryItems={galleryItems}
            onGalleryItemsChange={handleGalleryItemsChange}
            skippedBlocks={skippedBlocks}
            onSkipBlock={handleSkipBlock}
          />
        ) : null}

        {step === "publish" && event && activeEventId ? (
          <EventCreateStepPublish
            event={event}
            categories={categories}
            payoutReady={payoutReady}
            waiverCount={eventWaivers.length}
            hasCourse={Boolean(eventCourse?.routeGeojson)}
            publishing={publishingEvent}
            publishError={publishError}
            onPublish={() => void handlePublish()}
            advancedEditPath={eventAdvancedEditPath(activeEventId)}
          />
        ) : null}

        {step !== "info" && !activeEventId ? (
          <Navigate to="/staff/events/new" replace />
        ) : null}
      </EventCreateWizardLayout>
    </div>
  );
}

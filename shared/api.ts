/**
 * Shared types between client and server
 */

import type {
  CheckoutBreakdownSnapshot,
  FeePresentation,
} from "./checkoutBreakdown.js";

export type { CheckoutBreakdownSnapshot, FeePresentation };

export interface HealthResponse {
  status: string;
  database?: string;
  timestamp: string;
}

export interface PingResponse {
  message: string;
}

export interface AppVersionResponse {
  version: string | null;
}

export type {
  SitePublicProfile,
  LegalEntityConfig,
  ContactPageConfig,
} from "./siteLegal.js";

export interface SitePublicProfileResponse {
  profile: import("./siteLegal.js").SitePublicProfile;
}

export interface ResendEventUpdatesTopicSetting {
  topicId: string | null;
}

export interface AdminEmailSettingsResponse {
  resendEventUpdatesTopic: ResendEventUpdatesTopicSetting;
}

export interface AdminEmailSettingsUpdateResponse {
  ok: boolean;
  resendEventUpdatesTopic: ResendEventUpdatesTopicSetting;
}

export interface SportType {
  id: number;
  slug: string;
  name: string;
  icon?: string;
}

export interface SportTypesResponse {
  sportTypes: SportType[];
}

export interface EventListItem {
  id: number;
  slug: string;
  title: string;
  short_description?: string;
  start_date: string;
  end_date?: string;
  location_city?: string;
  location_state?: string;
  location_country: string;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  featured?: boolean;
  hero_image_url?: string;
  registration_count: number;
  registration_closes_at?: string;
  sport_slug: string;
  sport_name: string;
  organizer_name: string;
  organizer_slug: string;
  from_price_cents?: number | null;
  /** When true, Stripe checkout may offer MSI 3/6/9 (subject to min total). */
  msi_enabled?: boolean | number;
}

export interface EventsListResponse {
  events: EventListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type EventsSort =
  | "date_asc"
  | "date_desc"
  | "price_asc"
  | "price_desc"
  | "popular";

export interface EventsQueryParams {
  q?: string;
  sport?: string;
  city?: string;
  /** Canonical geo city id from geo_cities catalog */
  geoCityId?: number;
  featured?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: EventsSort;
  limit?: number;
  offset?: number;
}

export interface FilterCity {
  id: number;
  city: string;
  state?: string;
  event_count: number;
  lat?: number | string | null;
  lng?: number | string | null;
}

export interface GeoState {
  id: number;
  country: string;
  name: string;
  code: string;
}

export interface GeoCity {
  id: number;
  state_id: number;
  name: string;
  state_name: string;
  state_code: string;
  lat?: number | null;
  lng?: number | null;
}

export interface GeoStatesResponse {
  states: GeoState[];
}

export interface GeoCitiesResponse {
  cities: GeoCity[];
}

export interface GeoResolvedPlace {
  lat: number;
  lng: number;
  label: string;
  source: "event" | "venue" | "geo_cities" | "nominatim";
}

export interface GeoResolvePlaceResponse {
  place: GeoResolvedPlace | null;
}

export interface SearchSuggestEvent {
  slug: string;
  title: string;
  start_date: string;
  location_city?: string;
  location_state?: string;
  sport_name: string;
  sport_slug: string;
  hero_image_url?: string | null;
}

export interface SearchSuggestCity {
  id?: number;
  city: string;
  state?: string;
  event_count: number;
}

export interface SearchSuggestSport {
  slug: string;
  name: string;
  icon?: string | null;
}

export interface SearchSuggestResponse {
  query: string;
  events: SearchSuggestEvent[];
  cities: SearchSuggestCity[];
  sports: SearchSuggestSport[];
}

export type CoursePointType =
  | "start"
  | "finish"
  | "hydration"
  | "aid"
  | "medical"
  | "restroom"
  | "spectator"
  | "risk"
  | "km_marker"
  | "transition"
  | "other";

export interface CoursePoint {
  type: CoursePointType;
  name: string;
  lat: number;
  lng: number;
  km?: number;
  description?: string;
}

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface ElevationProfilePoint {
  km: number;
  elevation_m: number;
}

export interface EventCourse {
  routeGeojson: GeoJsonLineString | Record<string, unknown>;
  points: CoursePoint[];
  distanceKm?: number | string;
  elevationGainM?: number;
  elevationProfile?: ElevationProfilePoint[];
}

export interface EventMediaAsset {
  asset_type: string;
  url: string;
  alt_text?: string;
  mime_type?: string;
  sort_order: number;
  is_primary?: boolean;
}

export interface EventDetailEvent {
  id: number;
  slug: string;
  /** Vanity host label; public nice link {subdomain}.atleita.com */
  subdomain?: string | null;
  title: string;
  short_description?: string;
  description?: string;
  start_date: string;
  end_date?: string;
  registration_opens_at?: string;
  registration_closes_at?: string;
  timezone: string;
  location_name?: string;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_country: string;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  hero_image_url?: string;
  banner_image_url?: string;
  featured?: boolean;
  registration_count: number;
  max_registrations?: number;
  max_registrations_per_order?: number;
  requires_waiver?: boolean;
  sport_slug: string;
  sport_name: string;
  organizer_name: string;
  organizer_slug: string;
  /** Published organizer microsite vanity label (for legal doc links). */
  organizer_site_subdomain?: string | null;
  organizer_logo?: string;
  venue_name?: string;
  venue_address?: string;
  venue_lat?: number | string | null;
  venue_lng?: number | string | null;
  status: string;
  /** When true, Stripe checkout may offer MSI 3/6/9 (subject to min total). */
  msi_enabled?: boolean | number;
}

export type SponsorTier = "title" | "gold" | "silver" | "bronze" | "partner";

export interface EventSponsor {
  id?: number;
  name: string;
  logo_url?: string;
  website_url?: string;
  tier?: SponsorTier;
  sort_order: number;
}

export interface EventSponsorInput {
  name: string;
  logo_url?: string;
  website_url?: string;
  tier?: SponsorTier;
  sort_order?: number;
}

export interface EventSponsorsUpdateRequest {
  sponsors: EventSponsorInput[];
}

export interface EventSponsorsResponse {
  sponsors: EventSponsor[];
}

export type EventExtraType =
  | "merch"
  | "addon"
  | "folio"
  | "service"
  | "experience"
  | "custom";

export type EventExtraScopeType = "all_categories" | "selected_categories";

export type ExtraFieldType =
  | "text"
  | "textarea"
  | "select"
  | "checkbox"
  | "number"
  | "date";

export type ExtraFieldKind = "standard" | "mx_shipping_block";

export interface EventExtraField {
  id?: number;
  field_key: string;
  label: string;
  field_type: ExtraFieldType;
  field_kind?: ExtraFieldKind;
  options_json?: string[] | null;
  is_required: boolean | number;
  sort_order: number;
}

export interface EventExtra {
  id: number;
  public_uuid: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  image_url?: string | null;
  extra_type: EventExtraType;
  max_per_athlete: number;
  capacity?: number | null;
  sold_count?: number;
  sort_order: number;
  scope_type?: EventExtraScopeType;
  sales_opens_at?: string | null;
  sales_closes_at?: string | null;
  category_ids?: number[];
  fields?: EventExtraField[];
  sales_status?: "open" | "scheduled" | "ended";
}

export interface EventTag {
  slug: string;
  name: string;
  category?: string;
}

export interface ScheduleWave {
  id: number;
  name: string;
  starts_at: string;
  capacity?: number;
  registered_count: number;
  sort_order: number;
}

export interface EventCategory {
  id: number;
  name: string;
  description?: string;
  distance_km?: number;
  difficulty?: string;
  capacity?: number;
  sold_count: number;
  price_cents: number;
  service_fee_cents?: number;
  total_cents?: number;
  display_iva_cents?: number;
  organizer_fiscal_net_cents?: number;
  price_formatted?: string;
  service_fee_formatted?: string;
  total_formatted?: string;
  gender_restriction: string;
  min_age?: number;
  max_age?: number;
  waitlist_enabled?: boolean | number;
  sort_order: number;
}

export interface EventRegistrationField {
  id: number;
  field_key: string;
  label: string;
  field_type:
    | "text"
    | "textarea"
    | "select"
    | "checkbox"
    | "number"
    | "date"
    | "file";
  options_json?: string[] | null;
  is_required: boolean | number;
  sort_order: number;
  scope_type?: EventExtraScopeType;
  category_ids?: number[];
}

export interface EventMyRegistration {
  status: "confirmed";
  registrationPublicUuid: string;
  registrationNumber: string;
  categoryId: number;
  categoryName: string;
}

export interface EventWaiverPublic {
  id: number;
  title: string;
  content_html: string;
  pdf_url?: string | null;
  content_type: "html" | "pdf" | "both";
  /** all | adult (≥18) | minor (<18) on event start */
  audience?: "all" | "adult" | "minor";
  /** NULL/empty = all categories */
  category_ids?: number[] | null;
  version: number;
  sort_order?: number;
}

export interface EventSubdomainResolveResponse {
  subdomain: string;
  slug: string;
  title: string;
  canonical_path: string;
}

export interface EventSubdomainAvailableResponse {
  available: boolean;
  subdomain: string;
  error?: string;
}

export interface EventDetailResponse {
  event: EventDetailEvent;
  categories: EventCategory[];
  extras?: EventExtra[];
  registrationFields: EventRegistrationField[];
  sponsors: EventSponsor[];
  tags: EventTag[];
  scheduleWaves: ScheduleWave[];
  serviceFeePercent: number;
  feePresentation: FeePresentation;
  /** False when published paid categories exist but organizer Connect payout is not ready. */
  payments_available?: boolean;
  has_paid_categories?: boolean;
  course: EventCourse | null;
  media: EventMediaAsset[];
  /** All active waivers, ordered for registration */
  waivers?: EventWaiverPublic[];
  /** @deprecated First active waiver — use waivers[] */
  waiver?: EventWaiverPublic | null;
  myRegistration?: EventMyRegistration | null;
}

export interface AthleteUser {
  id: number;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  gender?: AthleteGender | null;
  shirtSize?: AthleteShirtSize | null;
  country?: string;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  avatarUrl?: string;
  preferredLanguage?: string;
  preferredTheme?: string;
}

export type AthleteGender = "male" | "female" | "other" | "prefer_not_to_say";
export type AthleteShirtSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export const ATHLETE_GENDERS: AthleteGender[] = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
];

export const ATHLETE_SHIRT_SIZES: AthleteShirtSize[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

export interface AthleteProfileUpdateRequest {
  first_name: string;
  last_name: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: AthleteGender | null;
  shirt_size?: AthleteShirtSize | null;
  country?: string;
  city?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface AthleteMeResponse {
  athlete: AthleteProfile;
}

/** Normalizes API date values (Date objects, ISO strings) to YYYY-MM-DD. */
export function normalizeApiDateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw;
}

/** Maps snake_case API athlete row to client AthleteUser. */
export function mapAthleteApiRow(a: Record<string, unknown>): AthleteUser {
  return {
    id: a.id as number,
    email: (a.email as string | null) || undefined,
    phone: (a.phone as string | null) || undefined,
    firstName: String(a.first_name ?? a.firstName ?? ""),
    lastName: String(a.last_name ?? a.lastName ?? ""),
    dateOfBirth: normalizeApiDateOnly(a.date_of_birth ?? a.dateOfBirth),
    gender: (a.gender as AthleteGender | null) ?? null,
    shirtSize: (a.shirt_size as AthleteShirtSize | null) ?? null,
    country: (a.country as string | undefined) ?? "MX",
    city: (a.city as string | null) ?? null,
    emergencyContactName: (a.emergency_contact_name as string | null) ?? null,
    emergencyContactPhone: (a.emergency_contact_phone as string | null) ?? null,
    avatarUrl: (a.avatar_url ?? a.avatarUrl) as string | undefined,
    preferredLanguage: (a.preferred_language ?? a.preferredLanguage) as
      | string
      | undefined,
    preferredTheme: (a.preferred_theme ?? a.preferredTheme) as
      | string
      | undefined,
  };
}

export interface AthleteCheckEmailResponse {
  exists: boolean;
  hasPassword?: boolean;
  hasSocialLogin?: boolean;
}

export interface AthleteOtpSentResponse {
  ok: true;
  email: string;
  message?: string;
  requiresOtp?: true;
}

export interface AthleteAuthSessionResponse {
  token: string;
  athlete: AthleteUser;
  isNew?: boolean;
  reactivated?: boolean;
}

export type StaffRole = "admin" | "organizer";

export interface AdminUser {
  type: "admin";
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: string;
  preferredTheme?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface OrganizerMemberUser {
  type: "organizer";
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizerId: number;
  organizerName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: string;
  preferredTheme?: string;
  eventAccessScope?: "organization" | "events";
  assignedEventIds?: number[];
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface StaffProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  preferred_language?: string;
  preferred_theme?: string;
}

export type StaffUser = AdminUser | OrganizerMemberUser;

export interface AthleteProfile {
  id: number;
  public_uuid?: string;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: AthleteGender | null;
  shirt_size?: AthleteShirtSize | null;
  country?: string;
  city?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  avatar_url?: string;
  preferred_language: string;
  preferred_theme?: string;
  created_at: string;
}

export interface AuthVerifyResponse {
  token: string;
  athlete?: {
    id: number;
    email?: string;
    firstName: string;
    lastName: string;
  };
  member?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizerId: number;
  };
  admin?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface RegistrationItem {
  id: number;
  public_uuid: string;
  registration_number: string;
  qr_code_token: string;
  bib_number?: string;
  status: string;
  total_cents: number;
  created_at: string;
  event_title: string;
  event_slug: string;
  start_date: string;
  category_name: string;
  allows_transfers?: boolean | number;
  waiver_outdated?: boolean;
  order_id?: number | null;
  /** True when this athlete is the purchaser holding wallet QRs */
  is_order_purchaser?: boolean;
  guest_claim_pending?: boolean;
  is_managed_participant?: boolean;
  participant_label?: string;
}

export interface AthleteOrderWalletPass {
  id: number;
  public_uuid: string;
  registration_number: string;
  qr_code_token: string;
  bib_number?: string | null;
  status: string;
  category_name: string;
  participant_label: string;
  participant_email?: string | null;
  guest_claim_pending: boolean;
  is_managed_participant: boolean;
  wallet_held_by_purchaser: boolean;
}

export interface AthleteOrderWallet {
  order_id: number;
  order_public_uuid: string;
  event_title: string;
  event_slug: string;
  start_date: string;
  item_count: number;
  passes: AthleteOrderWalletPass[];
}

export interface AthleteOrderWalletsResponse {
  wallets: AthleteOrderWallet[];
}

export type AthleteResultStatus = "finished" | "dnf" | "dns" | "dq";

export interface AthleteResultItem {
  id: number;
  event_title: string;
  event_slug: string;
  start_date: string;
  category_name: string;
  registration_number: string;
  bib_number?: string | null;
  overall_rank?: number | null;
  category_rank?: number | null;
  gender_rank?: number | null;
  finish_time_ms?: number | null;
  pace_per_km_ms?: number | null;
  status: AthleteResultStatus;
  published_at: string;
  splits?: ResultSplitRow[];
}

export interface AthleteResultVisualization {
  resultId: number;
  finishTimeMs?: number | null;
  splits: ResultSplitRow[];
  course: EventCourse | null;
  paceSegments: PaceHeatmapSegment[];
}

export interface PaceHeatmapSegment {
  kmStart: number;
  kmEnd: number;
  pacePerKmMs: number;
  intensity: number;
}

export interface AthleteResultsResponse {
  results: AthleteResultItem[];
}

export interface AthleteAvatarUpdateRequest {
  image: string;
}

export interface AthleteAvatarResponse {
  ok: boolean;
  avatar_url: string | null;
}

export interface AthleteRegistrationsResponse {
  registrations: RegistrationItem[];
}

export interface PaymentConfigResponse {
  publishableKey: string;
  currency: string;
}

export interface WaiverSignatureInput {
  waiverId: number;
  signature: string;
  /** Client-bound waiver version at acceptance time */
  waiverVersion?: number;
}

export interface PendingCheckoutItem {
  public_uuid: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  event_title: string;
  event_slug: string;
  category_name: string | null;
  category_id: number | null;
}

export interface PendingCheckoutResponse {
  pending: PendingCheckoutItem[];
}

export interface ConfirmRegistrationReject {
  message: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export interface RegistrationCheckoutRequest {
  categoryId?: number;
  lineItems?: GroupCheckoutLineItemInput[];
  fieldValues: Record<string, string | boolean>;
  idempotencyKey: string;
  discountCode?: string;
  /** Sign all active waivers */
  waiverSignatures?: WaiverSignatureInput[];
  /** @deprecated Use waiverSignatures */
  waiverId?: number;
  /** @deprecated Use waiverSignatures */
  waiverSignature?: string;
  waitlistEntryId?: number;
  selectedExtras?: Array<{ extraId: number; quantity: number }>;
  extraFieldAnswers?: Array<{
    extraId: number;
    values: Record<string, string | boolean | Record<string, unknown>>;
  }>;
}

export type GroupParticipantType = "self" | "account" | "guest";

export interface GroupGuestParticipant {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
}

export interface GroupCheckoutLineItemInput {
  lineId: string;
  participantType: GroupParticipantType;
  accountEmail?: string;
  guest?: GroupGuestParticipant;
  guardianRelationship?: string;
  /** Force managed-by-purchaser (no claim). Minors are auto-managed. */
  managedByPurchaser?: boolean;
  categoryId: number;
  fieldValues: Record<string, string | boolean>;
  waiverSignatures?: WaiverSignatureInput[];
  selectedExtras?: Array<{ extraId: number; quantity: number }>;
  extraFieldAnswers?: Array<{
    extraId: number;
    values: Record<string, string | boolean | Record<string, unknown>>;
  }>;
  waitlistEntryId?: number;
}

export interface RegistrationCheckoutExtraLine {
  extraId: number;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface RegistrationCheckoutResponse {
  paymentPublicUuid: string;
  clientSecret: string | null;
  amountCents: number;
  registrationAmountCents: number;
  serviceFeeCents: number;
  currency: string;
  categoryName: string;
  eventTitle: string;
  feePresentation?: FeePresentation;
  listPriceCents?: number;
  extrasSubtotalCents?: number;
  extras?: RegistrationCheckoutExtraLine[];
  displayIvaCents?: number;
  organizerFiscalNetCents?: number;
  discountAmountCents?: number;
  discountCode?: string;
  fieldValues?: Record<string, string | boolean>;
  orderMode?: "group";
  orderPublicUuid?: string;
  itemCount?: number;
  lineItems?: GroupCheckoutLineItemInput[];
  /** Checkout rail used for this payment */
  provider?: "stripe" | "mercadopago" | "mock";
  /** Mercado Pago Payment Brick */
  mpPreferenceId?: string | null;
  mpPublicKey?: string | null;
  mpInitPoint?: string | null;
  /** Stripe MSI available for this checkout (event on + Stripe rail + total ≥ $1,000). */
  msiAvailable?: boolean;
  msiAllowedPlans?: Array<3 | 6 | 9>;
  /** null = pay in full (contado); 3/6/9 = selected MSI plan. */
  msiPlanMonths?: 3 | 6 | 9 | null;
}

export interface RegistrationResumeResponse {
  status: "checkout" | "complete" | "failed" | "expired";
  checkout?: RegistrationCheckoutResponse;
  registration?: RegistrationConfirmResponse["registration"];
  confirmationEmail?: string;
  error?: string;
}

export interface DiscountValidateRequest {
  code: string;
  categoryId: number;
}

export interface DiscountValidateResponse {
  valid: true;
  code: string;
  discountCodeId: number;
  discountType: "percent" | "fixed_cents";
  discountValue: number;
  appliesTo: "registration" | "service_fee" | "total";
  feePresentation: FeePresentation;
  discountAmountCents: number;
  priceCents: number;
  serviceFeeCents: number;
  totalCents: number;
  displayIvaCents: number;
  organizerFiscalNetCents: number;
  originalPriceCents: number;
  originalServiceFeeCents: number;
  originalTotalCents: number;
}

export interface WaitlistJoinRequest {
  categoryId: number;
}

export interface GroupWaitlistJoinRequest {
  lineItems: Array<{
    categoryId: number;
    participantType: GroupParticipantType;
    accountEmail?: string;
    guest?: GroupGuestParticipant;
    guardianRelationship?: string;
  }>;
}

export interface WaitlistEntry {
  id: number;
  event_id: number;
  event_category_id: number;
  status: string;
  position: number;
  offered_at?: string | null;
  offer_expires_at?: string | null;
  created_at: string;
  event_title?: string;
  event_slug?: string;
  category_name?: string;
  can_claim?: boolean;
}

export interface AthleteWaitlistResponse {
  entries: WaitlistEntry[];
}

export interface StaffWaitlistEntry extends WaitlistEntry {
  athlete_id: number;
  athlete_first_name?: string;
  athlete_last_name?: string;
  athlete_email?: string;
}

export interface StaffWaitlistResponse {
  entries: StaffWaitlistEntry[];
}

export interface WaitlistOfferRequest {
  waitlistEntryId: number;
  offerExpiresHours?: number;
}

export interface RegistrationTransferRequest {
  recipientEmail: string;
}

export interface RegistrationTransferResponse {
  ok: boolean;
  transfer: {
    id: number;
    registration_id: number;
    status: string;
    completed_at?: string | null;
  };
}

export interface BulkBibRow {
  folio: string;
  bib: string;
}

export interface BulkBibImportRequest {
  rows: BulkBibRow[];
}

export interface BulkBibImportResponse {
  updated: number;
  errors: Array<{ folio: string; error: string }>;
}

export interface ResultSplitRow {
  id?: number;
  split_name: string;
  split_order: number;
  distance_km?: number | null;
  elapsed_ms: number;
  pace_per_km_ms?: number | null;
}

export interface ResultSplitsResponse {
  splits: ResultSplitRow[];
}

export interface ResultSplitsUpdateRequest {
  splits: ResultSplitRow[];
}

export interface StaffMediaAssetRow {
  id?: number;
  public_uuid?: string;
  asset_type: string;
  url: string;
  alt_text?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  width_px?: number | null;
  height_px?: number | null;
  sort_order: number;
  is_primary?: boolean;
}

export interface EventMediaResponse {
  media: StaffMediaAssetRow[];
}

export interface EventMediaUpdateRequest {
  media: StaffMediaAssetRow[];
}

export interface AdminEventCreateRequest extends StaffEventUpsertRequest {
  organizer_id: number;
}

export interface RegistrationConfirmRequest {
  paymentPublicUuid: string;
  paymentIntentId?: string;
  paymentMethodId?: string;
}

export interface AthletePaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface AthletePaymentMethodsResponse {
  paymentMethods: AthletePaymentMethod[];
  defaultPaymentMethodId: string | null;
}

export interface PaymentMethodSetupIntentResponse {
  clientSecret: string;
}

export interface SetDefaultPaymentMethodRequest {
  paymentMethodId: string;
}

export interface RegistrationConfirmResponse {
  success: boolean;
  requiresAction?: boolean;
  clientSecret?: string;
  /** Athlete login email — confirmation is always sent here (never staff email) */
  confirmationEmail?: string;
  registration?: {
    public_uuid: string;
    registration_number: string;
    qr_code_token: string;
    status: string;
    total_cents: number;
    category_name: string;
    event_title: string;
    event_slug: string;
  };
  order?: {
    publicUuid: string;
    itemCount: number;
    registrations: Array<{
      public_uuid: string;
      registration_number: string;
      qr_code_token: string;
      status: string;
      total_cents: number;
      category_name: string;
      participant_label?: string;
      participant_email?: string;
      guest_claim_token?: string | null;
      wallet_held_by_purchaser?: boolean;
      is_managed_participant?: boolean;
      bib_number?: string | null;
    }>;
  };
  error?: string;
}

export interface GuestClaimRegistrationRequest {
  claimToken: string;
}

export interface GuestClaimRegistrationResponse {
  success: boolean;
  registration: {
    public_uuid: string;
    registration_number: string;
    event_slug: string;
    event_title: string;
    category_name: string;
  };
}

export interface StaffDashboardStats {
  athletes?: number;
  organizers?: number;
  published_events?: number;
  pending_approval_events?: number;
  confirmed_registrations?: number;
  total_revenue_cents?: number;
}

export interface StaffEventRow {
  id: number;
  slug: string;
  title: string;
  status: string;
  visibility?: string;
  start_date: string;
  registration_count: number;
  organizer_id?: number;
  sport_name?: string;
  organizer_name?: string;
  location_city?: string;
  hero_image_url?: string | null;
  has_paid_categories?: boolean;
  payments_available?: boolean;
  is_simulation?: boolean;
}

export interface PaginatedStaffEventsResponse {
  events: StaffEventRow[];
  pagination: PaginationInfo;
}

export interface AdminAthleteRow {
  id: number;
  email?: string | null;
  phone?: string | null;
  first_name: string;
  last_name: string;
  city?: string | null;
  country?: string;
  status: string;
  created_at: string;
  registration_count: number;
}

export interface AdminAnalyticsResponse {
  stats: StaffDashboardStats;
  last_30_days: {
    registrations: number;
    revenue_cents: number;
  };
  top_events: Array<{
    id: number;
    title: string;
    slug: string;
    registration_count: number;
    revenue_cents: number;
  }>;
}

export interface OrganizerRegistrationRow {
  id: number;
  registration_number: string;
  bib_number?: string | null;
  status: string;
  total_cents: number;
  created_at: string;
  checked_in_at?: string | null;
  waiver_signed_at?: string | null;
  waiver_outdated?: boolean;
  event_id: number;
  event_title: string;
  event_slug: string;
  category_name: string;
  athlete_first_name: string;
  athlete_last_name: string;
  athlete_email?: string | null;
  athlete_id?: number;
  /** Group order linkage */
  order_id?: number | null;
  purchaser_athlete_id?: number | null;
  purchaser_first_name?: string | null;
  purchaser_last_name?: string | null;
  purchaser_email?: string | null;
  /** Pending adult guest claim */
  guest_claim_pending?: boolean;
  /** Minor or force-managed — no claim; purchaser holds QR */
  is_managed_participant?: boolean;
  order_sibling_count?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRegistrationsResponse {
  registrations: OrganizerRegistrationRow[];
  pagination: PaginationInfo;
}

export interface StaffRegistrationPayment {
  id: number;
  public_uuid: string;
  amount_cents: number;
  registration_amount_cents: number;
  service_fee_cents: number;
  currency: string;
  status: string;
  provider: string;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export interface StaffRegistrationFieldValue {
  field_key: string;
  label: string;
  field_type: string;
  value_text?: string | null;
  value_file_url?: string | null;
}

export interface StaffRegistrationWaiver {
  signed_at: string;
  signature_data?: string | null;
  waiver_name: string;
  waiver_version?: string | null;
}

export interface StaffRegistrationStatusHistoryRow {
  from_status?: string | null;
  to_status: string;
  actor_type: string;
  reason?: string | null;
  created_at: string;
}

export interface StaffRegistrationTransferRow {
  status: string;
  transfer_fee_cents: number;
  completed_at?: string | null;
  created_at: string;
  from_first_name: string;
  from_last_name: string;
  to_first_name: string;
  to_last_name: string;
}

export interface StaffPaymentRefundRow {
  id: number;
  amount_cents: number;
  currency: string;
  status: string;
  reason?: string | null;
  stripe_refund_id?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface StaffRegistrationDetailRow extends OrganizerRegistrationRow {
  public_uuid: string;
  qr_code_token: string;
  price_cents: number;
  service_fee_cents: number;
  source: string;
  waiver_signed_at?: string | null;
  updated_at: string;
  event_category_id: number;
  athlete_id: number;
  athlete_phone?: string | null;
  payment_id?: number | null;
}

export interface RegistrationPurchasedExtraFieldAnswer {
  field_key: string;
  label: string;
  value_text?: string | null;
  value_json?: Record<string, unknown> | null;
  field_kind?: ExtraFieldKind;
  field_type?: ExtraFieldType;
}

export interface RegistrationPurchasedExtra {
  event_extra_id: number;
  name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  field_answers?: RegistrationPurchasedExtraFieldAnswer[];
}

export interface StaffRegistrationDetailResponse {
  registration: StaffRegistrationDetailRow;
  payment: StaffRegistrationPayment | null;
  field_values: StaffRegistrationFieldValue[];
  purchased_extras: RegistrationPurchasedExtra[];
  /** @deprecated Use waivers */
  waiver: StaffRegistrationWaiver | null;
  waivers: StaffRegistrationWaiver[];
  status_history: StaffRegistrationStatusHistoryRow[];
  transfers: StaffRegistrationTransferRow[];
  refunds: StaffPaymentRefundRow[];
  /** Other registrations on the same group order */
  order_mates?: Array<{
    id: number;
    registration_number: string;
    bib_number?: string | null;
    status: string;
    athlete_first_name: string;
    athlete_last_name: string;
    athlete_email?: string | null;
    guest_claim_pending?: boolean;
    is_managed_participant?: boolean;
    qr_code_token?: string;
  }>;
}

export interface StaffManualRegistrationRequest {
  event_category_id: number;
  athlete_id?: number;
  athlete_email?: string;
  /** Create guest athlete when email has no account */
  create_guest?: boolean;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_date_of_birth?: string;
  guest_gender?: string;
  /** Force managed-by-purchaser (no claim). Minors are auto-managed. */
  managed_by_purchaser?: boolean;
  /** Purchaser athlete id when creating managed guest (defaults to staff-linked athlete if set) */
  purchaser_athlete_id?: number;
  purchaser_email?: string;
  comp?: boolean;
  /** Paid in-person sale — category price, no platform commission */
  manual_sale?: boolean;
  bib_number?: string;
  field_values?: Record<string, string>;
  /** Staff confirms waiver requirement is waived for this manual entry */
  waiver_waived?: boolean;
}

export interface AdminPaymentRow {
  id: number;
  public_uuid: string;
  registration_id?: number | null;
  athlete_id: number;
  organizer_id: number;
  event_id?: number | null;
  amount_cents: number;
  registration_amount_cents: number;
  service_fee_cents: number;
  currency: string;
  status: string;
  provider: string;
  stripe_payment_intent_id?: string | null;
  paid_at?: string | null;
  created_at: string;
  athlete_first_name?: string | null;
  athlete_last_name?: string | null;
  athlete_email?: string | null;
  event_title?: string | null;
  event_slug?: string | null;
  organizer_name?: string | null;
  registration_number?: string | null;
  recorded_by_member_id?: number | null;
  seller_first_name?: string | null;
  seller_last_name?: string | null;
  seller_email?: string | null;
}

export interface PaginatedAdminPaymentsResponse {
  payments: AdminPaymentRow[];
  pagination: PaginationInfo;
}

export interface OrganizerSellerSalesSummaryRow {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  sale_count: number;
  total_cents: number;
}

export interface OrganizerSellerSalesSummaryResponse {
  sellers: OrganizerSellerSalesSummaryRow[];
  manual_sale_total_cents: number;
  manual_sale_count: number;
}

export interface AdminPaymentDetail extends AdminPaymentRow {
  registration_status?: string | null;
  bib_number?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  stripe_charge_id?: string | null;
  fee_presentation?: FeePresentation | null;
  checkout_breakdown?: CheckoutBreakdownSnapshot | null;
}

export interface AdminPaymentDetailResponse {
  payment: AdminPaymentDetail;
}

export interface PaginatedAdminAthletesResponse {
  athletes: AdminAthleteRow[];
  pagination: PaginationInfo;
}

export interface StaffEventDetail {
  id: number;
  public_uuid: string;
  organizer_id: number;
  sport_type_id: number;
  slug: string;
  /** Vanity host label → https://{subdomain}.atleita.com (immutable) */
  subdomain?: string | null;
  title: string;
  short_description?: string | null;
  description?: string | null;
  status: string;
  visibility: string;
  featured: number | boolean;
  start_date: string;
  end_date?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  check_in_opens_at?: string | null;
  check_in_closes_at?: string | null;
  timezone?: string;
  location_name?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string;
  location_lat?: number | string | null;
  location_lng?: number | string | null;
  hero_image_url?: string | null;
  banner_image_url?: string | null;
  registration_count: number;
  max_registrations?: number | null;
  max_registrations_per_order?: number;
  /** folio = registration number is also the bib; separate = staff assigns bib later */
  bib_mode?: "folio" | "separate";
  /** When true, after the event day ends the event is auto-unlisted from the marketplace. Default true. */
  auto_deactivate_after_event?: boolean | number;
  requires_waiver?: boolean | number;
  fee_presentation?: FeePresentation | null;
  organizer_fee_presentation?: FeePresentation;
  /** Stripe MSI opt-in for this event (organizer; requires Stripe payouts ready). */
  msi_enabled?: boolean | number;
  /** When true, staff may record cash manual sales for this event. */
  manual_sales_enabled?: boolean | number;
  service_fee_percent?: number | string | null;
  organizer_service_fee_percent?: number | string | null;
  submitted_for_approval_at?: string | null;
  approval_rejection_reason?: string | null;
  sport_name?: string;
  organizer_name?: string;
  has_paid_categories?: boolean;
  payments_available?: boolean;
  is_simulation?: boolean | number;
  simulation_access_token?: string | null;
  simulation_expires_at?: string | null;
  simulation_last_activity_at?: string | null;
  /** ES terms + privacy + refund filled on organizer site */
  site_legal_ready?: boolean | number;
}

export interface StaffEventCategory {
  id: number;
  public_uuid: string;
  name: string;
  description?: string | null;
  distance_km?: number | null;
  difficulty?: string | null;
  capacity?: number | null;
  sold_count: number;
  price_cents: number;
  currency?: string;
  gender_restriction?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  sort_order: number;
  is_active: number | boolean;
  waitlist_enabled?: boolean | number;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
}

export interface StaffEventDetailResponse {
  event: StaffEventDetail;
  categories: StaffEventCategory[];
  extras?: StaffEventExtra[];
}

export interface StaffEventExtra {
  id: number;
  public_uuid: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  image_url?: string | null;
  extra_type: EventExtraType;
  max_per_athlete: number;
  capacity?: number | null;
  sold_count: number;
  sort_order: number;
  is_active: boolean | number;
  scope_type: EventExtraScopeType;
  sales_opens_at?: string | null;
  sales_closes_at?: string | null;
  category_ids: number[];
  fields: EventExtraField[];
  fields_locked: boolean;
}

export interface StaffEventExtraInput {
  name: string;
  description?: string | null;
  price_cents: number;
  currency?: string;
  image_url?: string | null;
  extra_type?: EventExtraType;
  max_per_athlete?: number;
  capacity?: number | null;
  sort_order?: number;
  is_free?: boolean;
  scope_type?: EventExtraScopeType;
  category_ids?: number[];
  sales_opens_at?: string | null;
  sales_closes_at?: string | null;
  fields?: EventExtraField[];
}

export interface StaffEventExtraPatch {
  name?: string;
  description?: string | null;
  price_cents?: number;
  image_url?: string | null;
  extra_type?: EventExtraType;
  max_per_athlete?: number;
  capacity?: number | null;
  sort_order?: number;
  is_free?: boolean;
  scope_type?: EventExtraScopeType;
  category_ids?: number[];
  sales_opens_at?: string | null;
  sales_closes_at?: string | null;
  fields?: EventExtraField[];
}

export interface StaffEventCategorySummary {
  id: number;
  name: string;
  capacity: number | null;
  sold_count: number;
}

export interface StaffEventHubSummary {
  confirmed_count: number;
  pending_count: number;
  cancelled_count: number;
  checked_in_count: number;
  revenue_cents: number;
  waitlist_count: number;
  categories: StaffEventCategorySummary[];
  has_paid_categories?: boolean;
  payments_available?: boolean;
}

export interface StaffEventHubSummaryResponse {
  summary: StaffEventHubSummary;
}

export interface StaffEventHubRegistrationsResponse {
  registrations: OrganizerRegistrationRow[];
}

export type {
  RegistrationExportCatalogResponse,
  RegistrationExportColumnMeta,
  RegistrationExportJsonResponse,
  RegistrationExportPresetId,
  RegistrationExportRequest,
  RegistrationExportStatus,
} from "./registrationExport";

export interface StaffEventUpsertRequest {
  title: string;
  slug?: string;
  /** Required on create; ignored/rejected on update (immutable). */
  subdomain?: string;
  sport_type_id: number;
  short_description?: string | null;
  description?: string | null;
  status?: string;
  visibility?: string;
  featured?: boolean;
  start_date: string;
  end_date?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  check_in_opens_at?: string | null;
  check_in_closes_at?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_name?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  hero_image_url?: string | null;
  banner_image_url?: string | null;
  max_registrations?: number | null;
  max_registrations_per_order?: number | null;
  requires_waiver?: boolean;
  /** folio: folio is the dorsal; separate: assign bib later. Default folio for new events. */
  bib_mode?: "folio" | "separate";
  /** null = inherit organizer default */
  fee_presentation?: FeePresentation | null;
  /** Offer Mexico MSI (3/6/9) on Stripe checkout; fee uplifts only when plan selected. */
  msi_enabled?: boolean;
  /** Enable staff cash manual sales (provider=manual) for this event. Default false. */
  manual_sales_enabled?: boolean;
  /** Auto-unlist from marketplace after the event day ends. Default true. */
  auto_deactivate_after_event?: boolean;
}

export interface StaffEventCategoryInput {
  name: string;
  description?: string | null;
  price_cents: number;
  capacity?: number | null;
  distance_km?: number | null;
  gender_restriction?: string;
  min_age?: number | null;
  max_age?: number | null;
  difficulty?: string | null;
  waitlist_enabled?: boolean;
  sort_order?: number;
}

export interface AdminAthleteDetail extends AdminAthleteRow {
  date_of_birth?: string | null;
  gender?: string | null;
  shirt_size?: string | null;
  last_login_at?: string | null;
}

export interface AdminAthleteDetailResponse {
  athlete: AdminAthleteDetail;
  registrations: Array<{
    id: number;
    registration_number: string;
    status: string;
    total_cents: number;
    created_at: string;
    event_id: number;
    event_title: string;
    event_slug: string;
  }>;
}

export interface RegistrationLookupResponse {
  registration: OrganizerRegistrationRow & {
    qr_code_token?: string;
    requires_waiver?: boolean | number;
    waiver_outdated?: boolean;
    purchased_extras?: RegistrationPurchasedExtra[];
  };
}

export interface CheckInResponse {
  ok: boolean;
  registration: {
    id: number;
    registration_number: string;
    bib_number?: string | null;
    status: string;
    checked_in_at: string;
    event_title: string;
    athlete_first_name: string;
    athlete_last_name: string;
  };
}

export interface CheckInWindowInfo {
  eventId: number;
  eventTitle: string;
  open: boolean;
  status: "open" | "not_yet" | "closed" | "invalid_timezone";
  timezone: string;
  opensAt: string;
  closesAt: string;
  opensAtLocal: string;
  closesAtLocal: string;
  firstEventDay: string;
  lastEventDay: string;
  usesCustomWindow: boolean;
}

export interface CheckInWindowResponse {
  window: CheckInWindowInfo;
  canBypassWindow?: boolean;
}

export interface OrganizerMemberRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: string;
  event_access_scope?: "organization" | "events";
  assigned_event_ids?: number[];
  status: string;
  invited_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
}

export interface AnalyticsTimeSeries {
  registrations_by_day: Array<{ day: string; registrations: number }>;
  revenue_by_day: Array<{ day: string; revenue_cents: number }>;
}

export interface OrganizerAnalyticsResponse {
  stats: {
    total_events?: number;
    published_events?: number;
    confirmed_registrations?: number;
    total_revenue_cents?: number;
  };
  registrations_by_day: AnalyticsTimeSeries["registrations_by_day"];
  revenue_by_day: AnalyticsTimeSeries["revenue_by_day"];
}

export interface EventRegistrationFieldRow {
  id?: number;
  field_key: string;
  label: string;
  field_type: string;
  options_json?: string | string[] | null;
  is_required: number | boolean;
  sort_order: number;
  is_active: number | boolean;
  scope_type?: EventExtraScopeType;
  category_ids?: number[];
}

export interface EventRegistrationFieldInput {
  field_key?: string;
  label: string;
  field_type: string;
  options?: string[];
  is_required?: boolean;
  sort_order?: number;
  is_active?: boolean;
  scope_type?: EventExtraScopeType;
  category_ids?: number[];
}

export interface EventWaiverRow {
  id: number;
  event_id?: number;
  title: string;
  content_html: string;
  pdf_url?: string | null;
  content_type: "html" | "pdf" | "both";
  audience?: "all" | "adult" | "minor";
  category_ids?: number[] | null;
  version: number;
  is_active: number | boolean;
  sort_order?: number;
  created_at: string;
}

export interface EventWaiverInput {
  id?: number;
  title: string;
  content_html?: string;
  pdf_url?: string | null;
  content_type?: "html" | "pdf" | "both";
  audience?: "all" | "adult" | "minor";
  category_ids?: number[] | null;
  sort_order?: number;
}

export interface StaffEventResultRow {
  id: number;
  registration_id: number;
  event_category_id?: number;
  overall_rank?: number | null;
  category_rank?: number | null;
  gender_rank?: number | null;
  finish_time_ms?: number | null;
  status: string;
  published_at?: string | null;
  registration_number: string;
  bib_number?: string | null;
  athlete_first_name?: string;
  athlete_last_name?: string;
  category_name?: string;
}

export interface StaffResultInput {
  registration_number: string;
  finish_time?: string;
  finish_time_ms?: number;
  overall_rank?: number | null;
  category_rank?: number | null;
  gender_rank?: number | null;
  status?: string;
}

export interface StaffEventCategoryPatch {
  name?: string;
  description?: string | null;
  price_cents?: number;
  capacity?: number | null;
  distance_km?: number | null;
  difficulty?: string | null;
  gender_restriction?: string;
  min_age?: number | null;
  max_age?: number | null;
  sort_order?: number;
  is_active?: boolean;
  waitlist_enabled?: boolean;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
}

export interface StaffScheduleWaveRow {
  id: number;
  event_category_id?: number | null;
  name: string;
  starts_at: string;
  capacity?: number | null;
  registered_count: number;
  sort_order: number;
}

export interface StaffScheduleWaveInput {
  name: string;
  starts_at: string;
  event_category_id?: number | null;
  capacity?: number | null;
  sort_order?: number;
}

export interface StaffEventCoursePayload {
  routeGeojson: GeoJsonLineString | Record<string, unknown>;
  points: CoursePoint[];
  distanceKm?: number | null;
  elevationGainM?: number | null;
  elevationProfile?: ElevationProfilePoint[] | null;
}

export interface AdminOrganizerRow {
  id: number;
  name: string;
  slug: string;
  email: string;
  city?: string | null;
  country?: string;
  status: string;
  logo_url?: string | null;
  event_count?: number;
  member_count?: number;
  created_at?: string;
}

export interface AdminOrganizersResponse {
  organizers: AdminOrganizerRow[];
}

export interface PaginatedAdminOrganizersResponse {
  organizers: AdminOrganizerRow[];
  pagination: PaginationInfo;
}

export interface AdminOrganizerDetail extends AdminOrganizerRow {
  onboarding_intake?: OrganizerOnboardingIntake | null;
  phone?: string | null;
  website_url?: string | null;
  description?: string | null;
  legal_name?: string | null;
  billing_email?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: number | boolean;
  stripe_connect_status?: StripeConnectStatus;
  stripe_charges_enabled?: number | boolean;
  stripe_payouts_enabled?: number | boolean;
  stripe_details_submitted?: number | boolean;
  stripe_connect_onboarded_at?: string | null;
  stripe_connect_last_synced_at?: string | null;
  stripe_connect_onboarding_mode?: "self" | "admin" | null;
  payout_terms_accepted_at?: string | null;
  payout_fee_acknowledged_at?: string | null;
  service_fee_percent?: number | string;
  fee_presentation?: FeePresentation;
  rfc?: string | null;
}

export interface AdminOrganizerLinkedEvent {
  id: number;
  title: string;
  slug: string;
  status: string;
  start_date: string;
  organizer_id: number;
  organizer_name?: string;
  registration_count?: number;
}

export interface AdminOrganizerDetailResponse {
  organizer: AdminOrganizerDetail;
  members: OrganizerMemberRow[];
  events: AdminOrganizerLinkedEvent[];
}

export interface AdminOrganizerCreateRequest {
  name: string;
  email: string;
  slug?: string;
  city?: string;
  country?: string;
  phone?: string;
  owner_email: string;
  owner_first_name: string;
  owner_last_name: string;
  event_ids?: number[];
  service_fee_percent?: number;
  legal_name?: string;
  rfc?: string;
}

export type OrganizerExpectedSizeBand = "<100" | "100-500" | "500+";

export interface OrganizerOnboardingIntake {
  event_name?: string | null;
  sport_type_id?: number | null;
  rough_date?: string | null;
  expected_size?: OrganizerExpectedSizeBand | null;
  self_service_registered_at?: string | null;
  locale?: string | null;
}

export interface PublicOrganizerRegisterRequest {
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  owner_phone?: string | null;
  name: string;
  email?: string;
  phone?: string | null;
  city: string;
  country?: string;
  intake?: Partial<OrganizerOnboardingIntake> | null;
  locale?: string;
}

export interface PublicOrganizerRegisterResponse {
  organizer: { id: number; name: string; slug: string; email: string };
  next: "verify_otp";
}

export interface AdminOrganizerUpdateRequest {
  name?: string;
  email?: string;
  slug?: string;
  city?: string;
  country?: string;
  phone?: string;
  status?: "pending" | "active" | "suspended" | "inactive";
  service_fee_percent?: number;
  fee_presentation?: FeePresentation;
  legal_name?: string;
  billing_email?: string;
  rfc?: string;
  tax_regime?: string;
}

export type StripeConnectStatus =
  | "not_started"
  | "pending"
  | "action_required"
  | "ready"
  | "restricted"
  | "disabled";

export interface PayoutChecklistItem {
  key: string;
  complete: boolean;
  required: boolean;
}

export interface OrganizerConnectInfo {
  organizer_id: number;
  email: string;
  legal_name?: string | null;
  billing_email?: string | null;
  rfc?: string | null;
  tax_regime?: string | null;
  service_fee_percent: number;
  fee_presentation: FeePresentation;
  payout_rail?: "stripe" | "manual";
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | number;
  stripe_connect_status: StripeConnectStatus;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_connect_onboarded_at?: string | null;
  stripe_connect_last_synced_at?: string | null;
  stripe_connect_onboarding_mode?: "self" | "admin" | null;
  payout_terms_accepted_at?: string | null;
  payout_fee_acknowledged_at?: string | null;
  requirements_currently_due?: string[];
  requirements_eventually_due?: string[];
  requirements_disabled_reason?: string | null;
}

export type OrganizerPayoutAccountStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "rejected";

export type OrganizerPayoutPersonType = "persona_fisica" | "persona_moral";

/** Public payout account — never includes full CLABE. */
export interface OrganizerPayoutAccountPublic {
  id: number;
  organizer_id: number;
  nickname: string;
  holder_name: string;
  clabe_last4: string;
  bank_name?: string | null;
  person_type: OrganizerPayoutPersonType;
  legal_name: string;
  tax_regime?: string | null;
  rfc?: string | null;
  curp?: string | null;
  fiscal_street?: string | null;
  fiscal_ext_number?: string | null;
  fiscal_int_number?: string | null;
  fiscal_neighborhood?: string | null;
  fiscal_city?: string | null;
  fiscal_municipality?: string | null;
  fiscal_state?: string | null;
  fiscal_postal_code?: string | null;
  phone?: string | null;
  invoice_email?: string | null;
  constancia_url?: string | null;
  bank_statement_url?: string | null;
  is_default: boolean;
  status: OrganizerPayoutAccountStatus;
  rejection_reason?: string | null;
  locked_at?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizerPayoutAccountUpsertRequest {
  nickname?: string;
  holder_name?: string;
  /** Full CLABE — write-only; never returned. */
  clabe?: string;
  bank_name?: string | null;
  person_type?: OrganizerPayoutPersonType;
  legal_name?: string;
  tax_regime?: string | null;
  rfc?: string | null;
  curp?: string | null;
  fiscal_street?: string | null;
  fiscal_ext_number?: string | null;
  fiscal_int_number?: string | null;
  fiscal_neighborhood?: string | null;
  fiscal_city?: string | null;
  fiscal_municipality?: string | null;
  fiscal_state?: string | null;
  fiscal_postal_code?: string | null;
  phone?: string | null;
  invoice_email?: string | null;
  constancia_url?: string | null;
  bank_statement_url?: string | null;
  is_default?: boolean;
}

export interface OrganizerPayoutAccountsListResponse {
  accounts: OrganizerPayoutAccountPublic[];
}

export interface OrganizerPayoutAccountResponse {
  account: OrganizerPayoutAccountPublic;
}

/** Admin-only: full CLABE for SPEI (never returned on public account payloads). */
export interface AdminOrganizerPayoutClabeRevealResponse {
  clabe: string;
  account: OrganizerPayoutAccountPublic;
}

export interface OrganizerPayoutStatusResponse {
  organizer: OrganizerConnectInfo;
  platformChecklist: { items: PayoutChecklistItem[]; complete: boolean };
  stripeChecklist: { items: PayoutChecklistItem[]; complete: boolean };
  payoutReady: boolean;
  preferredRail?: "stripe" | "manual";
  effectiveRail?: "stripe" | "manual" | null;
  railFallback?: boolean;
  serviceFeePercent: number;
  stripeServiceFeePercent?: number;
  feePresentation: FeePresentation;
  stripeReady?: boolean;
  /** Verified default Cuenta de Pago + Atleita checklist. */
  manualReady?: boolean;
  manualAccounts?: OrganizerPayoutAccountPublic[];
  /** Publishable key for Connect.js embedded components. */
  stripePublishableKey?: string;
  /** Prefer in-app embedded onboarding over hosted Account Links. */
  embeddedOnboarding?: boolean;
  /** Live Connect dashboard kind from Stripe (none = white-label Atleita UI). */
  connectDashboard?: "none" | "express" | "full" | "unknown";
  /** Provisioning model from Stripe metadata / controller shape. */
  connectModel?: string | null;
  /** True when embedded Connect components are the preferred UX for this account. */
  embeddedPreferred?: boolean;
}

export interface OrganizerPayoutOnboardResponse extends OrganizerPayoutStatusResponse {
  /** Hosted Account Link fallback URL when embedded session unavailable. */
  url?: string | null;
  /** AccountSession client secret for Connect embedded components. */
  clientSecret?: string;
}

export interface OrganizerPayoutAccountSessionResponse {
  clientSecret: string;
  publishableKey: string;
  url?: string | null;
  stripeAccountId: string;
  connectDashboard?: "none" | "express" | "full" | "unknown";
  embeddedPreferred?: boolean;
}

export interface OrganizerPayoutLoginResponse {
  url: string;
}

/** SPEI settlement queue (platform-mode Stripe → ops SPEI to Cuenta de Pago). */
export type SpeiSettlementStatus = "pending" | "sent" | "cancelled";

export interface SpeiSettlementRow {
  id: number;
  payment_id: number;
  organizer_id: number;
  organizer_name?: string;
  event_id: number | null;
  event_title: string | null;
  amount_cents: number;
  currency: string;
  status: SpeiSettlementStatus;
  payout_account_id: number | null;
  /** Last 4 of CLABE only — never full CLABE. */
  clabe_last4: string | null;
  bank_name?: string | null;
  marked_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpeiSettlementListResponse {
  settlements: SpeiSettlementRow[];
  pending_total_cents: number;
  sent_total_cents: number;
}

export interface SpeiSettlementMarkSentRequest {
  notes?: string;
}

export interface SpeiSettlementMarkSentResponse {
  settlement: SpeiSettlementRow;
}

export interface OrganizerPayoutProfileUpdateRequest {
  legal_name?: string;
  billing_email?: string;
  rfc?: string;
  tax_regime?: string;
  fee_presentation?: FeePresentation;
}

export interface CheckoutBreakdownPreview {
  mode: FeePresentation;
  listPriceCents: number;
  inscriptionCents: number;
  serviceFeePercent: number;
  serviceFeeCents: number;
  displayIvaCents: number;
  totalCents: number;
  athleteTotalCents: number;
  organizerReceivesCents: number;
  organizerFiscalNetCents: number;
  stripeOrganizerTransferCents: number;
  platformFeeCents: number;
  inscriptionBaseCents: number;
  inscriptionIvaCents: number;
  serviceFeeBaseCents: number;
  serviceFeeIvaCents: number;
}

export interface AdminStaffRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: string;
  status: string;
  last_login_at?: string | null;
  created_at: string;
}

export interface PaginatedAdminStaffResponse {
  admins: AdminStaffRow[];
  pagination: PaginationInfo;
}

export interface AdminStaffCreateRequest {
  email: string;
  first_name: string;
  last_name: string;
  role?: "admin" | "super_admin";
  phone?: string;
}

export interface AdminStaffUpdateRequest {
  status?: "active" | "inactive" | "suspended";
  role?: "admin" | "super_admin";
}

export interface SponsorAnalyticsRow {
  sponsor_id: number;
  name: string;
  tier: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface SponsorAnalyticsResponse {
  sponsors: SponsorAnalyticsRow[];
  totals: { impressions: number; clicks: number; ctr: number };
}

export interface SponsorTrackRequest {
  sponsorId: number;
  type: "impression" | "click";
}

export interface StaffDiscountCodeRow {
  id: number;
  event_id?: number | null;
  code: string;
  description?: string | null;
  discount_type: "percent" | "fixed_cents";
  discount_value: number;
  applies_to: "registration" | "service_fee" | "total";
  max_uses?: number | null;
  used_count: number;
  min_purchase_cents?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: number | boolean;
  created_at: string;
}

export interface StaffDiscountCodeInput {
  code: string;
  description?: string;
  discount_type?: "percent" | "fixed_cents";
  discount_value: number;
  applies_to?: "registration" | "service_fee" | "total";
  max_uses?: number | null;
  min_purchase_cents?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface StaffDiscountCodePatch {
  description?: string | null;
  discount_type?: "percent" | "fixed_cents";
  discount_value?: number;
  applies_to?: "registration" | "service_fee" | "total";
  max_uses?: number | null;
  min_purchase_cents?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export type FolioCouponScope =
  | "any"
  | "none"
  | "any_coupon"
  | "specific_coupon";

export type FolioCounterScope = "segment" | "event" | "category";

export type FolioPatternPart =
  | { kind: "token"; token: string }
  | { kind: "literal"; value: string };

export interface StaffFolioSegmentRow {
  id: number;
  event_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  category_scope: EventExtraScopeType;
  category_ids: number[];
  coupon_scope: FolioCouponScope;
  discount_code_id?: number | null;
  counter_scope: FolioCounterScope;
  prefix_value: string;
  category_code: string;
  pattern_tokens: FolioPatternPart[];
  seq_padding: number;
  start_number: number;
  /** Inclusive end of block; null = unlimited. */
  end_number: number | null;
  last_issued_number?: number | null;
  folios_remaining?: number | null;
  created_at: string;
  updated_at: string;
}

export interface StaffFolioSegmentInput {
  id?: number;
  name: string;
  sort_order: number;
  is_active?: boolean;
  category_scope?: EventExtraScopeType;
  category_ids?: number[];
  coupon_scope: FolioCouponScope;
  discount_code_id?: number | null;
  counter_scope: FolioCounterScope;
  prefix_value?: string;
  category_code?: string;
  pattern_tokens: FolioPatternPart[];
  seq_padding?: number;
  start_number?: number;
  /** Inclusive end of block; null/omit = unlimited. */
  end_number?: number | null;
}

export interface BulkMessageRequest {
  subject: string;
  body: string;
}

/** @deprecated Use event broadcasts (Resend) instead */
export interface BulkMessageResponse {
  queued: number;
  skipped: number;
  total: number;
}

export type EventBroadcastStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "failed"
  | "cancelled";

export type EventBroadcastSendMode = "now" | "scheduled";

export type EventBroadcastTemplateKey =
  | "race_day_reminder"
  | "weather_update"
  | "schedule_change"
  | "parking_info"
  | "general_update";

export interface EventBroadcastRow {
  id: number;
  publicUuid: string;
  eventId: number;
  organizerId: number;
  audienceType: "confirmed";
  templateKey: string | null;
  subject: string;
  contentHtml: string;
  fromDisplay: string;
  status: EventBroadcastStatus;
  sendMode: EventBroadcastSendMode;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  errorMessage: string | null;
  createdAt: string;
  createdByMemberId: number | null;
  createdByAdminId: number | null;
}

export interface EventBroadcastListResponse {
  broadcasts: EventBroadcastRow[];
}

export interface EventBroadcastAudienceResponse {
  audienceType: "confirmed";
  recipientCount: number;
}

export interface EventBroadcastTemplateItem {
  key: EventBroadcastTemplateKey;
  subject: string;
  preheader: string;
  title: string;
  bodyHtml: string;
}

export interface EventBroadcastTemplatesResponse {
  templates: EventBroadcastTemplateItem[];
}

export interface EventBroadcastPreviewRequest {
  subject: string;
  contentHtml: string;
  preheader?: string;
  title?: string;
}

export interface EventBroadcastPreviewResponse {
  html: string;
  fromDisplay: string;
  subject: string;
}

export interface CreateEventBroadcastRequest {
  subject: string;
  contentHtml: string;
  preheader?: string;
  title?: string;
  templateKey?: EventBroadcastTemplateKey | null;
  sendMode?: EventBroadcastSendMode;
  scheduledAt?: string | null;
}

export interface EventBroadcastSendResponse {
  broadcast: EventBroadcastRow;
  recipientCount: number;
}

export interface TransferRequest {
  recipientEmail: string;
}

export interface RegistrationTransferRow {
  id: number;
  registration_id: number;
  from_athlete_id: number;
  to_athlete_id: number;
  transfer_fee_cents: number;
  status: "pending" | "completed" | "cancelled";
  payment_id?: number | null;
  completed_at?: string | null;
  created_at: string;
}

export interface TransferInitiateResponse {
  transfer: RegistrationTransferRow;
}

export interface PublicPlatformStats {
  published_events: number;
  active_athletes: number;
  confirmed_registrations: number;
}

export interface PublicHomeDataResponse {
  stats: PublicPlatformStats;
  /** @deprecated Home uses `events`; kept empty for backward compatibility */
  featured_events: EventListItem[];
  /** All published public events (same as `events`) */
  upcoming_events: EventListItem[];
  events: EventListItem[];
}

export interface CdnUploadResponse {
  ok: boolean;
  url: string;
  path: string;
}

/** Staff proxy response for remote image fetch (event hero / gallery import). */
export interface StaffFetchImageResponse {
  dataBase64: string;
  mimeType: string;
}


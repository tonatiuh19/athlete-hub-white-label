import * as Yup from "yup";
import type {
  EventRegistrationFieldInput,
  EventSponsorInput,
  StaffDiscountCodeInput,
  StaffEventCategoryInput,
  StaffEventCategoryPatch,
  StaffMediaAssetRow,
  StaffScheduleWaveInput,
} from "@shared/api";

/** i18n key strings used as Yup messages — resolve with t() in UI. */
export const EVENT_EDIT_VALIDATION_KEYS = {
  required: "staffPortal.eventEdit.validation.required",
  minLength: "staffPortal.eventEdit.validation.minLength",
  fieldType: "staffPortal.eventEdit.validation.fieldType",
  selectOptions: "staffPortal.eventEdit.validation.selectOptions",
  optionRequired: "staffPortal.eventEdit.validation.optionRequired",
  capacityMin: "staffPortal.eventEdit.validation.capacityMin",
  discountCode: "staffPortal.eventEdit.validation.discountCode",
  discountType: "staffPortal.eventEdit.validation.discountType",
  percentRange: "staffPortal.eventEdit.validation.percentRange",
  amountPositive: "staffPortal.eventEdit.validation.amountPositive",
  maxUsesMin: "staffPortal.eventEdit.validation.maxUsesMin",
  invalidUrl: "staffPortal.eventEdit.validation.invalidUrl",
  sortOrder: "staffPortal.eventEdit.validation.sortOrder",
  categoryName: "staffPortal.eventEdit.validation.categoryName",
  categoryPrice: "staffPortal.eventEdit.validation.categoryPrice",
} as const;

const V = EVENT_EDIT_VALIDATION_KEYS;

const REGISTRATION_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "checkbox",
  "number",
  "date",
] as const;

export const registrationFieldItemSchema = Yup.object({
  label: Yup.string().trim().min(1, V.required).required(V.required),
  field_type: Yup.string()
    .oneOf([...REGISTRATION_FIELD_TYPES], V.fieldType)
    .required(V.fieldType),
  is_required: Yup.boolean().default(false),
  options: Yup.array()
    .of(Yup.string().trim().min(1, V.optionRequired).required(V.optionRequired))
    .when("field_type", {
      is: "select",
      then: (schema) =>
        schema.min(1, V.selectOptions).required(V.selectOptions),
      otherwise: (schema) => schema.optional().nullable(),
    }),
  category_ids: Yup.array().of(Yup.number().integer()).optional(),
  field_key: Yup.string().optional(),
  sort_order: Yup.number().optional(),
  is_active: Yup.boolean().optional(),
  scope_type: Yup.mixed<"all_categories" | "selected_categories">()
    .oneOf(["all_categories", "selected_categories"])
    .optional(),
});

export const registrationFieldsSchema = Yup.array().of(registrationFieldItemSchema);

export const scheduleWaveItemSchema = Yup.object({
  name: Yup.string().trim().min(1, V.required).required(V.required),
  starts_at: Yup.string().trim().min(1, V.required).required(V.required),
  capacity: Yup.number()
    .min(0, V.capacityMin)
    .nullable()
    .optional()
    .transform((val, orig) => (orig === "" || orig === undefined ? null : val)),
  event_category_id: Yup.number().nullable().optional(),
  sort_order: Yup.number().optional(),
});

export const scheduleWavesSchema = Yup.array().of(scheduleWaveItemSchema);

export const discountDraftSchema = Yup.object({
  code: Yup.string()
    .transform((v) => (typeof v === "string" ? v.trim().toUpperCase() : v))
    .min(2, V.discountCode)
    .required(V.discountCode)
    .matches(/^[A-Z0-9_-]+$/i, V.discountCode),
  discount_type: Yup.mixed<"percent" | "fixed_cents">()
    .oneOf(["percent", "fixed_cents"], V.discountType)
    .default("percent"),
  discount_value: Yup.number()
    .required(V.required)
    .when("discount_type", {
      is: "percent",
      then: (schema) =>
        schema.min(1, V.percentRange).max(100, V.percentRange),
      otherwise: (schema) => schema.min(1, V.amountPositive),
    }),
  max_uses: Yup.number()
    .integer()
    .min(1, V.maxUsesMin)
    .nullable()
    .optional()
    .transform((val, orig) => (orig === "" || orig === undefined ? null : val)),
  description: Yup.string().optional(),
  applies_to: Yup.mixed<"registration" | "service_fee" | "total">()
    .oneOf(["registration", "service_fee", "total"])
    .optional(),
  min_purchase_cents: Yup.number().nullable().optional(),
  valid_from: Yup.string().nullable().optional(),
  valid_until: Yup.string().nullable().optional(),
  is_active: Yup.boolean().optional(),
});

const urlOrEmpty = Yup.string()
  .trim()
  .optional()
  .test("url-or-empty", V.invalidUrl, (value) => {
    if (value == null || value === "") return true;
    try {
      // Allow blob: previews and absolute http(s) URLs
      if (value.startsWith("blob:")) return true;
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  });

export const sponsorItemSchema = Yup.object({
  name: Yup.string().trim().min(1, V.required).required(V.required),
  tier: Yup.mixed<"title" | "gold" | "silver" | "bronze" | "partner">()
    .oneOf(["title", "gold", "silver", "bronze", "partner"])
    .optional(),
  logo_url: Yup.string().optional(),
  website_url: urlOrEmpty,
  sort_order: Yup.number().optional(),
});

export const sponsorsSchema = Yup.array().of(sponsorItemSchema);

export const mediaItemSchema = Yup.object({
  // Pending uploads are handled outside validation (blob: / empty url OK).
  url: Yup.string().optional().default(""),
  title: Yup.string().trim().optional(),
  alt_text: Yup.string().nullable().optional(),
  sort_order: Yup.number().required(V.sortOrder),
  asset_type: Yup.string().optional(),
  role: Yup.string().optional(),
  kind: Yup.string().optional(),
  id: Yup.number().optional(),
  public_uuid: Yup.string().optional(),
  mime_type: Yup.string().nullable().optional(),
  file_size_bytes: Yup.number().nullable().optional(),
  width_px: Yup.number().nullable().optional(),
  height_px: Yup.number().nullable().optional(),
  is_primary: Yup.boolean().optional(),
});

export const mediaItemsSchema = Yup.array().of(mediaItemSchema);

/** New-category create form (name + price_cents). */
export const categorySchema = Yup.object({
  name: Yup.string().trim().min(1, V.categoryName).required(V.categoryName),
  price_cents: Yup.number()
    .min(0, V.categoryPrice)
    .required(V.categoryPrice),
  description: Yup.string().nullable().optional(),
  capacity: Yup.number().nullable().optional(),
  distance_km: Yup.number().nullable().optional(),
  gender_restriction: Yup.string().optional(),
  min_age: Yup.number().nullable().optional(),
  max_age: Yup.number().nullable().optional(),
  difficulty: Yup.string().nullable().optional(),
  waitlist_enabled: Yup.boolean().optional(),
  sort_order: Yup.number().optional(),
});

/** Edit draft may omit fields; name/price validated when present. */
export const categoryDraftSchema = Yup.object({
  name: Yup.string().trim().min(1, V.categoryName).optional(),
  price_cents: Yup.number().min(0, V.categoryPrice).optional(),
  description: Yup.string().nullable().optional(),
  capacity: Yup.number().nullable().optional(),
  distance_km: Yup.number().nullable().optional(),
  gender_restriction: Yup.string().optional(),
  min_age: Yup.number().nullable().optional(),
  max_age: Yup.number().nullable().optional(),
  difficulty: Yup.string().nullable().optional(),
  waitlist_enabled: Yup.boolean().optional(),
  sort_order: Yup.number().optional(),
  is_active: Yup.boolean().optional(),
  registration_opens_at: Yup.string().nullable().optional(),
  registration_closes_at: Yup.string().nullable().optional(),
}).test("name-or-price-when-set", V.categoryName, function (value) {
  if (value?.name !== undefined && !String(value.name).trim()) {
    return this.createError({ path: "name", message: V.categoryName });
  }
  if (value?.price_cents !== undefined) {
    const n = Number(value.price_cents);
    if (!Number.isFinite(n) || n < 0) {
      return this.createError({ path: "price_cents", message: V.categoryPrice });
    }
  }
  return true;
});

export const registrationFieldsFormSchema = Yup.object({
  fields: registrationFieldsSchema,
});

export const scheduleWavesFormSchema = Yup.object({
  waves: scheduleWavesSchema,
});

export const sponsorsFormSchema = Yup.object({
  sponsors: sponsorsSchema,
});

export const mediaItemsFormSchema = Yup.object({
  media: mediaItemsSchema,
});

export type RegistrationFieldDraft = Yup.InferType<typeof registrationFieldItemSchema>;
export type ScheduleWaveDraft = Yup.InferType<typeof scheduleWaveItemSchema>;
export type DiscountDraft = Yup.InferType<typeof discountDraftSchema>;
export type SponsorDraft = Yup.InferType<typeof sponsorItemSchema>;
export type MediaItemDraft = Yup.InferType<typeof mediaItemSchema>;
export type CategoryDraft = Yup.InferType<typeof categorySchema>;

export type RegistrationFieldsFormValues = Yup.InferType<typeof registrationFieldsFormSchema>;
export type ScheduleWavesFormValues = Yup.InferType<typeof scheduleWavesFormSchema>;
export type SponsorsFormValues = Yup.InferType<typeof sponsorsFormSchema>;
export type MediaItemsFormValues = Yup.InferType<typeof mediaItemsFormSchema>;

/** Inferred-type helpers — narrow unknown payloads after Yup validation. */
export function asRegistrationFields(
  value: unknown,
): EventRegistrationFieldInput[] {
  return registrationFieldsSchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as EventRegistrationFieldInput[];
}

export function asScheduleWaves(value: unknown): StaffScheduleWaveInput[] {
  return scheduleWavesSchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as StaffScheduleWaveInput[];
}

export function asDiscountDraft(value: unknown): StaffDiscountCodeInput {
  return discountDraftSchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as StaffDiscountCodeInput;
}

export function asSponsors(value: unknown): EventSponsorInput[] {
  return sponsorsSchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as EventSponsorInput[];
}

export function asMediaItems(value: unknown): StaffMediaAssetRow[] {
  return mediaItemsSchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as StaffMediaAssetRow[];
}

export function asCategoryInput(value: unknown): StaffEventCategoryInput {
  return categorySchema.validateSync(value, {
    abortEarly: false,
    stripUnknown: false,
  }) as StaffEventCategoryInput;
}

export function validateCategoryDraft(
  value: StaffEventCategoryPatch | StaffEventCategoryInput,
): Record<string, string> {
  try {
    categoryDraftSchema.validateSync(value, { abortEarly: false });
    return {};
  } catch (err) {
    if (!(err instanceof Yup.ValidationError)) return {};
    const out: Record<string, string> = {};
    for (const inner of err.inner.length > 0 ? err.inner : [err]) {
      if (inner.path && !out[inner.path]) out[inner.path] = inner.message;
    }
    return out;
  }
}

export function validateNewCategory(
  value: StaffEventCategoryInput,
): Record<string, string> {
  try {
    categorySchema.validateSync(value, { abortEarly: false });
    return {};
  } catch (err) {
    if (!(err instanceof Yup.ValidationError)) return {};
    const out: Record<string, string> = {};
    for (const inner of err.inner.length > 0 ? err.inner : [err]) {
      if (inner.path && !out[inner.path]) out[inner.path] = inner.message;
    }
    return out;
  }
}

export const EMPTY_DISCOUNT_DRAFT: StaffDiscountCodeInput = {
  code: "",
  discount_type: "percent",
  discount_value: 10,
  applies_to: "registration",
  max_uses: 50,
};

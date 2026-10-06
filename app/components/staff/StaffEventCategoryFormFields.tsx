import { useTranslation } from "react-i18next";
import DateTimePickerField from "@/components/ui/datetime-picker-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldRow } from "@/components/staff/event-edit/primitives";
import type { StaffEventCategoryPatch } from "@shared/api";
import type { FeePresentation } from "@shared/checkoutBreakdown";

export type CategoryFormValues = StaffEventCategoryPatch & {
  name?: string;
  price_cents?: number;
};

export interface StaffEventCategoryFormFieldsProps {
  values: CategoryFormValues;
  onChange: (patch: Partial<CategoryFormValues>) => void;
  idPrefix: string;
  showPrice?: boolean;
  priceDisplay?: number;
  onPriceChange?: (priceMxn: number) => void;
  feePresentation?: FeePresentation;
}

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
const GENDERS = ["any", "male", "female"] as const;

export default function StaffEventCategoryFormFields({
  values,
  onChange,
  idPrefix,
  showPrice = true,
  priceDisplay,
  onPriceChange,
  feePresentation = "pass_through",
}: StaffEventCategoryFormFieldsProps) {
  const { t } = useTranslation();
  const absorbAll = feePresentation === "absorb_all";

  const priceMxn =
    priceDisplay ??
    (values.price_cents != null ? values.price_cents / 100 : undefined);

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <FieldRow
        id={`${idPrefix}-name`}
        label={<>{t("staffPortal.eventEdit.categoryName")} *</>}
        fullWidth
      >
        <Input
          id={`${idPrefix}-name`}
          className="h-9"
          value={values.name ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t("staffPortal.eventEdit.categoryNamePlaceholder")}
        />
      </FieldRow>

      {showPrice ? (
        <FieldRow
          id={`${idPrefix}-price`}
          label={
            <>
              {absorbAll
                ? t("staffPortal.eventEdit.categoryPriceSticker")
                : t("staffPortal.eventEdit.categoryPriceInscription")}{" "}
              *
            </>
          }
          hint={
            absorbAll
              ? t("staffPortal.eventEdit.categoryPriceHintAbsorb")
              : t("staffPortal.eventEdit.categoryPriceHintPassThrough")
          }
        >
          <Input
            id={`${idPrefix}-price`}
            type="number"
            min={0}
            step={0.01}
            className="h-9"
            value={priceMxn ?? ""}
            onChange={(e) => {
              const mxn = Number(e.target.value);
              if (onPriceChange) {
                onPriceChange(mxn);
              } else {
                onChange({
                  price_cents: Number.isFinite(mxn)
                    ? Math.round(mxn * 100)
                    : undefined,
                });
              }
            }}
          />
        </FieldRow>
      ) : null}

      <FieldRow
        id={`${idPrefix}-distance`}
        label={t("staffPortal.eventEdit.categoryDistance")}
        hint={t("staffPortal.eventEdit.categoryDistanceHint")}
      >
        <Input
          id={`${idPrefix}-distance`}
          type="number"
          min={0}
          step={0.01}
          className="h-9"
          value={values.distance_km ?? ""}
          onChange={(e) =>
            onChange({
              distance_km: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="21"
        />
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-capacity`}
        label={t("staffPortal.eventEdit.categoryCapacity")}
        hint={t("staffPortal.eventEdit.categoryCapacityHint")}
      >
        <Input
          id={`${idPrefix}-capacity`}
          type="number"
          min={0}
          className="h-9"
          value={values.capacity ?? ""}
          onChange={(e) =>
            onChange({
              capacity: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-gender`}
        label={t("staffPortal.eventEdit.categoryGenderLabel")}
        hint={t("staffPortal.eventEdit.categoryGenderHint")}
      >
        <Select
          value={values.gender_restriction ?? "any"}
          onValueChange={(v) => onChange({ gender_restriction: v })}
        >
          <SelectTrigger id={`${idPrefix}-gender`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {t(`staffPortal.eventEdit.categoryGender.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-difficulty`}
        label={t("staffPortal.eventEdit.categoryDifficultyLabel")}
      >
        <Select
          value={values.difficulty ?? "none"}
          onValueChange={(v) =>
            onChange({ difficulty: v === "none" ? null : v })
          }
        >
          <SelectTrigger id={`${idPrefix}-difficulty`} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t("staffPortal.eventEdit.categoryDifficulty.none")}
            </SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {t(`staffPortal.eventEdit.categoryDifficulty.${d}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-min-age`}
        label={t("staffPortal.eventEdit.categoryMinAge")}
      >
        <Input
          id={`${idPrefix}-min-age`}
          type="number"
          min={0}
          max={120}
          className="h-9"
          value={values.min_age ?? ""}
          onChange={(e) =>
            onChange({
              min_age: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-max-age`}
        label={t("staffPortal.eventEdit.categoryMaxAge")}
        hint={t("staffPortal.eventEdit.categoryAgeHint")}
      >
        <Input
          id={`${idPrefix}-max-age`}
          type="number"
          min={0}
          max={120}
          className="h-9"
          value={values.max_age ?? ""}
          onChange={(e) =>
            onChange({
              max_age: e.target.value ? Number(e.target.value) : null,
            })
          }
        />
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-description`}
        label={t("staffPortal.eventEdit.categoryDescription")}
        fullWidth
      >
        <Textarea
          id={`${idPrefix}-description`}
          rows={2}
          className="min-h-[2.5rem]"
          value={values.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || null })}
          placeholder={t("staffPortal.eventEdit.categoryDescriptionPlaceholder")}
        />
      </FieldRow>

      <label className="sm:col-span-2 flex items-center gap-2 text-xs text-foreground">
        <Checkbox
          checked={Boolean(values.waitlist_enabled)}
          onCheckedChange={(checked) =>
            onChange({ waitlist_enabled: checked === true })
          }
        />
        {t("staffPortal.eventEdit.categoryWaitlist")}
      </label>

      <FieldRow
        id={`${idPrefix}-reg-opens`}
        label={t("staffPortal.eventEdit.categoryRegOpens")}
      >
        <DateTimePickerField
          id={`${idPrefix}-reg-opens`}
          value={
            typeof values.registration_opens_at === "string"
              ? values.registration_opens_at
              : ""
          }
          onChange={(v) => onChange({ registration_opens_at: v || null })}
        />
      </FieldRow>

      <FieldRow
        id={`${idPrefix}-reg-closes`}
        label={t("staffPortal.eventEdit.categoryRegCloses")}
      >
        <DateTimePickerField
          id={`${idPrefix}-reg-closes`}
          value={
            typeof values.registration_closes_at === "string"
              ? values.registration_closes_at
              : ""
          }
          onChange={(v) => onChange({ registration_closes_at: v || null })}
        />
      </FieldRow>
    </div>
  );
}

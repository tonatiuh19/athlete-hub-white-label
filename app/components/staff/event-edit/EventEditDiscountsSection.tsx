import { useFormik } from "formik";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import {
  DraftListRow,
  FieldRow,
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
import {
  discountDraftSchema,
  EMPTY_DISCOUNT_DRAFT,
} from "@/utils/eventEditDraftSchemas";
import type { StaffDiscountCodeInput, StaffDiscountCodeRow } from "@shared/api";

export type EventEditDiscountsTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditDiscountsSectionProps {
  discountCodes: StaffDiscountCodeRow[];
  discountCodesError: string | null;
  savingDiscountCode: boolean;
  numLocale: string;
  /** Returns true when create succeeded (form resets). */
  onCreate: (draft: StaffDiscountCodeInput) => void | Promise<boolean | void>;
  onToggleActive: (codeId: number, isActive: boolean) => void;
  onDelete: (codeId: number) => void;
  t: EventEditDiscountsTranslate;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function EventEditDiscountsSection({
  discountCodes,
  discountCodesError,
  savingDiscountCode,
  numLocale,
  onCreate,
  onToggleActive,
  onDelete,
  t,
  onDirtyChange,
}: EventEditDiscountsSectionProps) {
  const formik = useFormik<StaffDiscountCodeInput>({
    initialValues: { ...EMPTY_DISCOUNT_DRAFT },
    enableReinitialize: true,
    validationSchema: discountDraftSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values, helpers) => {
      const ok = await onCreate({
        ...values,
        code: values.code.trim().toUpperCase(),
      });
      if (ok === true) {
        helpers.resetForm({ values: { ...EMPTY_DISCOUNT_DRAFT } });
      }
    },
  });

  useFormikDirtyReport(formik.dirty, onDirtyChange);

  const err = (path: keyof StaffDiscountCodeInput) => {
    if (formik.submitCount < 1) return null;
    const msg = formik.errors[path];
    return typeof msg === "string" ? t(msg) : null;
  };

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.discountsTitle")}
      hint={t("staffPortal.eventEdit.discountsSubtitle")}
    >
      {discountCodesError ? (
        <p className="text-xs text-destructive">{discountCodesError}</p>
      ) : null}

      <div className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <FieldRow fullWidth label={t("staffPortal.eventEdit.discountCode")}>
            <Input
              className="font-mono uppercase"
              placeholder={t("staffPortal.eventEdit.discountCode")}
              value={formik.values.code}
              onChange={(e) =>
                void formik.setFieldValue("code", e.target.value.toUpperCase())
              }
            />
            {err("code") ? (
              <p className="text-[11px] text-destructive mt-1">{err("code")}</p>
            ) : null}
          </FieldRow>
          <FieldRow label={t("staffPortal.eventEdit.discountType")}>
            <Select
              value={formik.values.discount_type ?? "percent"}
              onValueChange={(v) =>
                void formik.setFieldValue(
                  "discount_type",
                  v as "percent" | "fixed_cents",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">
                  {t("staffPortal.eventEdit.discountPercent")}
                </SelectItem>
                <SelectItem value="fixed_cents">
                  {t("staffPortal.eventEdit.discountFixed")}
                </SelectItem>
              </SelectContent>
            </Select>
            {err("discount_type") ? (
              <p className="text-[11px] text-destructive mt-1">
                {err("discount_type")}
              </p>
            ) : null}
          </FieldRow>
          <div className="grid grid-cols-2 gap-2.5 sm:col-span-2">
            <FieldRow label={t("staffPortal.eventEdit.discountValue")}>
              <Input
                type="number"
                min={1}
                placeholder={t("staffPortal.eventEdit.discountValue")}
                value={formik.values.discount_value}
                onChange={(e) =>
                  void formik.setFieldValue(
                    "discount_value",
                    Number(e.target.value),
                  )
                }
              />
              {err("discount_value") ? (
                <p className="text-[11px] text-destructive mt-1">
                  {err("discount_value")}
                </p>
              ) : null}
            </FieldRow>
            <FieldRow label={t("staffPortal.eventEdit.discountMaxUses")}>
              <Input
                type="number"
                min={1}
                placeholder={t("staffPortal.eventEdit.discountMaxUses")}
                value={formik.values.max_uses ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  void formik.setFieldValue(
                    "max_uses",
                    raw === "" ? null : Math.max(1, Number(raw) || 1),
                  );
                }}
              />
              {err("max_uses") ? (
                <p className="text-[11px] text-destructive mt-1">
                  {err("max_uses")}
                </p>
              ) : null}
            </FieldRow>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto sm:min-w-[10rem]"
          onClick={() => void formik.submitForm()}
          disabled={savingDiscountCode}
        >
          {savingDiscountCode ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {t("staffPortal.eventEdit.addDiscount")}
        </Button>
      </div>

      {discountCodes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.eventEdit.noDiscounts")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {discountCodes.map((dc) => (
            <DraftListRow
              key={dc.id}
              className="sm:items-center"
              actions={
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => onToggleActive(dc.id, Boolean(dc.is_active))}
                  >
                    {Boolean(dc.is_active)
                      ? t("staffPortal.eventEdit.deactivateDiscount")
                      : t("staffPortal.eventEdit.activateDiscount")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={t("staffPortal.eventEdit.deleteDiscount")}
                    onClick={() => onDelete(dc.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              }
            >
              <div className="sm:col-span-12 min-w-0 space-y-0.5">
                <p className="font-mono text-sm font-semibold text-foreground tracking-wide">
                  {dc.code}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {dc.discount_type === "percent"
                    ? `${dc.discount_value}%`
                    : `$${(dc.discount_value / 100).toLocaleString(numLocale)} MXN`}
                  {" · "}
                  {t("staffPortal.eventEdit.discountUses", {
                    used: dc.used_count,
                    max: dc.max_uses ?? "∞",
                  })}
                </p>
              </div>
            </DraftListRow>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

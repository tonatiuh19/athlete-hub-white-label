import { useFormik, getIn } from "formik";
import { useMemo } from "react";
import StaffCategoryScopePicker from "@/components/staff/StaffCategoryScopePicker";
import StaffRegistrationFieldsGuide from "@/components/staff/StaffRegistrationFieldsGuide";
import StaffSetupDependencyEmpty from "@/components/staff/StaffSetupDependencyEmpty";
import { SectionShell } from "@/components/staff/event-edit/primitives";
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
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import { cn } from "@/lib/utils";
import {
  builtinOverlapSeverity,
  matchBuiltinRegistrationField,
} from "@/utils/builtinRegistrationFields";
import {
  registrationFieldsFormSchema,
  type RegistrationFieldsFormValues,
} from "@/utils/eventEditDraftSchemas";
import { stableJson } from "@/utils/eventEditUnsavedState";
import type { EventRegistrationFieldInput, StaffEventCategory } from "@shared/api";
import { AlertTriangle, Loader2, Plus, Save, Trash2 } from "lucide-react";

export type EventEditFieldsTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditFieldsSectionProps {
  initialFields: EventRegistrationFieldInput[];
  categories: StaffEventCategory[];
  fieldsError: string | null;
  savingFields: boolean;
  onSave: (fields: EventRegistrationFieldInput[]) => void;
  t: EventEditFieldsTranslate;
  /** For empty ticket-type scope deep-link. */
  eventId?: number | null;
  onDirtyChange?: (dirty: boolean) => void;
}

function fieldError(
  t: EventEditFieldsTranslate,
  errors: unknown,
  path: string,
  submitCount: number,
): string | null {
  if (submitCount < 1) return null;
  const msg = getIn(errors, path);
  return typeof msg === "string" ? t(msg) : null;
}

export default function EventEditFieldsSection({
  initialFields,
  categories,
  fieldsError,
  savingFields,
  onSave,
  t,
  eventId,
  onDirtyChange,
}: EventEditFieldsSectionProps) {
  const formik = useFormik<RegistrationFieldsFormValues>({
    initialValues: {
      fields: initialFields as RegistrationFieldsFormValues["fields"],
    },
    enableReinitialize: true,
    validationSchema: registrationFieldsFormSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values, helpers) => {
      onSave(values.fields as EventRegistrationFieldInput[]);
      helpers.resetForm({ values: { fields: values.fields } });
    },
  });

  const fields = formik.values.fields as EventRegistrationFieldInput[];

  const fieldsDirty = useMemo(
    () => stableJson(fields) !== stableJson(initialFields),
    [fields, initialFields],
  );

  useFormikDirtyReport(fieldsDirty, onDirtyChange);

  const setFields = (next: EventRegistrationFieldInput[]) => {
    void formik.setFieldValue("fields", next);
  };

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.fieldsTitle")}
      hint={t("staffPortal.eventEdit.fieldsSubtitle")}
    >
      <StaffRegistrationFieldsGuide />
      {fieldsError ? <p className="text-xs text-destructive">{fieldsError}</p> : null}

      <div className="space-y-2">
        {fields.map((f, i) => {
          const overlapKind = matchBuiltinRegistrationField(f.label);
          const overlapSeverity = overlapKind
            ? builtinOverlapSeverity(overlapKind)
            : null;
          const labelErr = fieldError(
            t,
            formik.errors,
            `fields.${i}.label`,
            formik.submitCount,
          );
          const optionsErr = fieldError(
            t,
            formik.errors,
            `fields.${i}.options`,
            formik.submitCount,
          );
          return (
            <div
              key={i}
              className="space-y-2 rounded-md border border-border/70 p-2.5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    className="w-full"
                    placeholder={t("staffPortal.eventEdit.fieldLabel")}
                    value={f.label}
                    onChange={(e) => {
                      const next = [...fields];
                      next[i] = { ...next[i], label: e.target.value };
                      setFields(next);
                    }}
                  />
                  {labelErr ? (
                    <p className="text-[11px] text-destructive">{labelErr}</p>
                  ) : null}
                </div>
                <Select
                  value={f.field_type}
                  onValueChange={(v) => {
                    const next = [...fields];
                    next[i] = {
                      ...next[i],
                      field_type: v,
                      options: v === "select" ? next[i].options ?? [""] : undefined,
                    };
                    setFields(next);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["text", "textarea", "select", "checkbox", "number", "date"] as const
                    ).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`staffPortal.eventEdit.fieldType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label
                  htmlFor={`field-required-${i}`}
                  className="inline-flex items-center gap-2 h-9 px-2 rounded-md border border-border/70 bg-card shrink-0 whitespace-nowrap text-xs font-medium cursor-pointer select-none"
                >
                  <Checkbox
                    id={`field-required-${i}`}
                    checked={Boolean(f.is_required)}
                    onCheckedChange={(checked) => {
                      const next = [...fields];
                      next[i] = { ...next[i], is_required: checked === true };
                      setFields(next);
                    }}
                  />
                  {t("staffPortal.eventEdit.fieldRequired")}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0 self-end sm:self-center"
                  onClick={() => setFields(fields.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {overlapKind && overlapSeverity ? (
                <p
                  className={cn(
                    "flex items-start gap-2 text-[11px] rounded-md border px-2.5 py-1.5",
                    overlapSeverity === "duplicate" || overlapSeverity === "derived"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-primary/25 bg-primary/10 text-foreground",
                  )}
                  role="status"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                  <span>
                    {t(`staffPortal.eventEdit.builtinFields.overlap.${overlapSeverity}`, {
                      field: t(`staffPortal.eventEdit.builtinFields.kinds.${overlapKind}`),
                    })}
                  </span>
                </p>
              ) : null}
              {f.field_type === "select" ? (
                <div className="space-y-1.5 pl-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    {t("staffPortal.eventEdit.fieldOptions")}
                  </p>
                  {optionsErr ? (
                    <p className="text-[11px] text-destructive">{optionsErr}</p>
                  ) : null}
                  {(f.options ?? []).map((opt, oi) => {
                    const optErr = fieldError(
                      t,
                      formik.errors,
                      `fields.${i}.options.${oi}`,
                      formik.submitCount,
                    );
                    return (
                      <div key={oi} className="space-y-1">
                        <div className="flex gap-1.5">
                          <Input
                            className="flex-1"
                            placeholder={t("staffPortal.eventEdit.fieldOptionPlaceholder")}
                            value={opt}
                            onChange={(e) => {
                              const next = [...fields];
                              const opts = [...(next[i].options ?? [])];
                              opts[oi] = e.target.value;
                              next[i] = { ...next[i], options: opts };
                              setFields(next);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => {
                              const next = [...fields];
                              next[i] = {
                                ...next[i],
                                options: (next[i].options ?? []).filter(
                                  (_, idx) => idx !== oi,
                                ),
                              };
                              setFields(next);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {optErr ? (
                          <p className="text-[11px] text-destructive">{optErr}</p>
                        ) : null}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      const next = [...fields];
                      next[i] = {
                        ...next[i],
                        options: [...(next[i].options ?? []), ""],
                      };
                      setFields(next);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t("staffPortal.eventEdit.addOption")}
                  </Button>
                </div>
              ) : null}
              <StaffCategoryScopePicker
                groupName={`registration-field-scope-${i}`}
                scopeType={f.scope_type ?? "all_categories"}
                categoryIds={f.category_ids ?? []}
                categories={categories}
                t={t}
                emptyAction={
                  eventId ? (
                    <StaffSetupDependencyEmpty
                      message={t("staffPortal.eventEdit.extraScopeNoCategories")}
                      actionLabel={t(
                        "staffPortal.eventEdit.extraScopeGoToTicketTypes",
                      )}
                      to={`/staff/events/${eventId}/edit?tab=categories`}
                    />
                  ) : undefined
                }
                onChange={(patch) => {
                  const next = [...fields];
                  next[i] = { ...next[i], ...patch };
                  setFields(next);
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setFields([
              ...fields,
              {
                label: "",
                field_type: "text",
                is_required: false,
                sort_order: fields.length,
                scope_type: "all_categories",
                category_ids: [],
              },
            ])
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t("staffPortal.eventEdit.addField")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void formik.submitForm()}
          disabled={savingFields}
        >
          {savingFields ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("staffPortal.eventEdit.saveFields")}
        </Button>
      </div>
    </SectionShell>
  );
}

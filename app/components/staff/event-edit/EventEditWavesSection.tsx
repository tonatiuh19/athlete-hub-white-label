import { useFormik, getIn } from "formik";
import { useMemo } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  DraftListRow,
  SectionShell,
} from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import DateTimePickerField from "@/components/ui/datetime-picker-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormikDirtyReport } from "@/hooks/use-formik-dirty-report";
import {
  scheduleWavesFormSchema,
  type ScheduleWavesFormValues,
} from "@/utils/eventEditDraftSchemas";
import { stableJson } from "@/utils/eventEditUnsavedState";
import type { StaffEventCategory, StaffScheduleWaveInput } from "@shared/api";

export type EventEditWavesTranslate = (
  key: string,
  opts?: Record<string, unknown>,
) => string;

export interface EventEditWavesSectionProps {
  initialWaves: StaffScheduleWaveInput[];
  categories: StaffEventCategory[];
  wavesError: string | null;
  savingWaves: boolean;
  onSave: (waves: StaffScheduleWaveInput[]) => void;
  t: EventEditWavesTranslate;
  onDirtyChange?: (dirty: boolean) => void;
}

function fieldError(
  t: EventEditWavesTranslate,
  errors: unknown,
  path: string,
  submitCount: number,
): string | null {
  if (submitCount < 1) return null;
  const msg = getIn(errors, path);
  return typeof msg === "string" ? t(msg) : null;
}

export default function EventEditWavesSection({
  initialWaves,
  categories,
  wavesError,
  savingWaves,
  onSave,
  t,
  onDirtyChange,
}: EventEditWavesSectionProps) {
  const formik = useFormik<ScheduleWavesFormValues>({
    initialValues: { waves: initialWaves },
    enableReinitialize: true,
    validationSchema: scheduleWavesFormSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: (values, helpers) => {
      onSave(values.waves as StaffScheduleWaveInput[]);
      helpers.resetForm({ values: { waves: values.waves } });
    },
  });

  const waves = formik.values.waves as StaffScheduleWaveInput[];

  const wavesDirty = useMemo(
    () => stableJson(waves) !== stableJson(initialWaves),
    [waves, initialWaves],
  );

  useFormikDirtyReport(wavesDirty, onDirtyChange);

  const setWaves = (next: StaffScheduleWaveInput[]) => {
    void formik.setFieldValue("waves", next);
  };

  return (
    <SectionShell
      title={t("staffPortal.eventEdit.wavesTitle")}
      hint={t("staffPortal.eventEdit.wavesSubtitle")}
    >
      {wavesError ? <p className="text-xs text-destructive">{wavesError}</p> : null}

      <div className="space-y-2">
        {waves.map((w, i) => {
          const nameErr = fieldError(
            t,
            formik.errors,
            `waves.${i}.name`,
            formik.submitCount,
          );
          const startsErr = fieldError(
            t,
            formik.errors,
            `waves.${i}.starts_at`,
            formik.submitCount,
          );
          const capacityErr = fieldError(
            t,
            formik.errors,
            `waves.${i}.capacity`,
            formik.submitCount,
          );
          return (
            <div key={i} className="space-y-1">
              <DraftListRow
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setWaves(waves.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                }
              >
                <Input
                  className="sm:col-span-3"
                  placeholder={t("staffPortal.eventEdit.waveName")}
                  value={w.name}
                  onChange={(e) => {
                    const next = [...waves];
                    next[i] = { ...next[i], name: e.target.value };
                    setWaves(next);
                  }}
                />
                <DateTimePickerField
                  className="sm:col-span-3"
                  value={w.starts_at}
                  onChange={(v) => {
                    const next = [...waves];
                    next[i] = { ...next[i], starts_at: v };
                    setWaves(next);
                  }}
                />
                <Select
                  value={w.event_category_id ? String(w.event_category_id) : "all"}
                  onValueChange={(v) => {
                    const next = [...waves];
                    next[i] = {
                      ...next[i],
                      event_category_id: v === "all" ? null : Number(v),
                    };
                    setWaves(next);
                  }}
                >
                  <SelectTrigger className="sm:col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("staffPortal.eventEdit.waveAllCategories")}
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="sm:col-span-2"
                  type="number"
                  min={0}
                  placeholder={t("staffPortal.eventEdit.waveCapacity")}
                  value={w.capacity ?? ""}
                  onChange={(e) => {
                    const next = [...waves];
                    next[i] = {
                      ...next[i],
                      capacity: e.target.value ? Number(e.target.value) : null,
                    };
                    setWaves(next);
                  }}
                />
              </DraftListRow>
              {(nameErr || startsErr || capacityErr) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-0.5">
                  {nameErr ? (
                    <p className="text-[11px] text-destructive">{nameErr}</p>
                  ) : null}
                  {startsErr ? (
                    <p className="text-[11px] text-destructive">{startsErr}</p>
                  ) : null}
                  {capacityErr ? (
                    <p className="text-[11px] text-destructive">{capacityErr}</p>
                  ) : null}
                </div>
              )}
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
            setWaves([
              ...waves,
              { name: "", starts_at: "", sort_order: waves.length },
            ])
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t("staffPortal.eventEdit.addWave")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void formik.submitForm()}
          disabled={savingWaves}
        >
          {savingWaves ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("staffPortal.eventEdit.saveWaves")}
        </Button>
      </div>
    </SectionShell>
  );
}

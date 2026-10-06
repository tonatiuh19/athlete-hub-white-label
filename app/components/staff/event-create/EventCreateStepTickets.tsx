import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addEventCategory,
  deleteEventCategory,
} from "@/store/slices/staffPortalSlice";
import {
  EVENT_CATEGORY_TEMPLATES,
  templateToCategoryInput,
} from "@/utils/eventCategoryTemplates";
import { getNumberLocale } from "@/utils/dateLocale";
import type { StaffEventCategory, StaffRole } from "@shared/api";
import { cn } from "@/lib/utils";

const WIZARD_TEMPLATE_IDS = ["5k", "10k", "21k", "kids"] as const;

type TicketAddMode = (typeof WIZARD_TEMPLATE_IDS)[number] | "custom" | null;

const EMPTY_CATEGORY_BODY = {
  gender_restriction: "any" as const,
  waitlist_enabled: false,
};

export interface EventCreateStepTicketsProps {
  eventId: number;
  staffRole: StaffRole;
  categories: StaffEventCategory[];
  onCategoriesChange?: () => void;
}

export default function EventCreateStepTickets({
  eventId,
  staffRole,
  categories,
  onCategoriesChange,
}: EventCreateStepTicketsProps) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { savingCategory } = useAppSelector((s) => s.staffPortal);
  const numLocale = getNumberLocale(i18n.language);

  const [addMode, setAddMode] = useState<TicketAddMode>(null);
  const [priceMxn, setPriceMxn] = useState("");
  const [customName, setCustomName] = useState("");

  const templates = EVENT_CATEGORY_TEMPLATES.filter((tpl) =>
    WIZARD_TEMPLATE_IDS.includes(tpl.id as (typeof WIZARD_TEMPLATE_IDS)[number]),
  );

  const handlePickTemplate = (templateId: (typeof WIZARD_TEMPLATE_IDS)[number]) => {
    const template = EVENT_CATEGORY_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!template) return;
    setAddMode(templateId);
    setCustomName(t(`staffPortal.eventEdit.categoryTemplates.${template.nameKey}`));
    setPriceMxn("");
  };

  const handlePickCustom = () => {
    setAddMode("custom");
    setCustomName("");
    setPriceMxn("");
  };

  const clearAddForm = () => {
    setAddMode(null);
    setCustomName("");
    setPriceMxn("");
  };

  const handleAdd = async () => {
    if (!addMode || !customName.trim() || priceMxn === "") return;
    const price_cents = Math.round(Number(priceMxn) * 100);
    if (!Number.isFinite(price_cents) || price_cents < 0) return;

    const template =
      addMode === "custom"
        ? null
        : EVENT_CATEGORY_TEMPLATES.find((tpl) => tpl.id === addMode);
    if (addMode !== "custom" && !template) return;

    const body =
      addMode === "custom"
        ? {
            name: customName.trim(),
            price_cents,
            ...EMPTY_CATEGORY_BODY,
          }
        : templateToCategoryInput(template!, customName.trim(), price_cents);

    const result = await dispatch(
      addEventCategory({ eventId, role: staffRole, body }),
    );
    if (addEventCategory.fulfilled.match(result)) {
      clearAddForm();
      onCategoriesChange?.();
    }
  };

  const handleDelete = async (categoryId: number) => {
    const result = await dispatch(
      deleteEventCategory({ eventId, categoryId, role: staffRole }),
    );
    if (deleteEventCategory.fulfilled.match(result)) {
      onCategoriesChange?.();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          {t("staffPortal.eventCreate.wizardSteps.tickets.formTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("staffPortal.eventCreate.wizardSteps.tickets.formHint")}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t("staffPortal.eventCreate.wizardSteps.tickets.advancedLegendTitle")}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("staffPortal.eventCreate.wizardSteps.tickets.advancedLegendBody")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("staffPortal.eventCreate.wizardSteps.tickets.templates")}</Label>
        <div className="flex flex-wrap gap-2">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handlePickTemplate(tpl.id as (typeof WIZARD_TEMPLATE_IDS)[number])}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                addMode === tpl.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/40",
              )}
            >
              {t(`staffPortal.eventEdit.categoryTemplates.${tpl.nameKey}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={handlePickCustom}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              addMode === "custom"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/40",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("staffPortal.eventCreate.wizardSteps.tickets.customCategory")}
          </button>
        </div>
      </div>

      {addMode ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          {addMode === "custom" ? (
            <p className="text-xs text-muted-foreground">
              {t("staffPortal.eventCreate.wizardSteps.tickets.customHint")}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-name">{t("staffPortal.eventEdit.categoryName")}</Label>
              <Input
                id="ticket-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-price">{t("staffPortal.eventEdit.categoryPrice")}</Label>
              <Input
                id="ticket-price"
                type="number"
                min={0}
                step="0.01"
                value={priceMxn}
                onChange={(e) => setPriceMxn(e.target.value)}
                className="h-11"
                placeholder="350"
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={
              savingCategory ||
              !customName.trim() ||
              priceMxn === "" ||
              !Number.isFinite(Number(priceMxn))
            }
            onClick={() => void handleAdd()}
          >
            {savingCategory ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t("staffPortal.eventCreate.wizardSteps.tickets.addTicket")}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>{t("staffPortal.eventCreate.wizardSteps.tickets.added")}</Label>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-4">
            {t("staffPortal.eventCreate.wizardSteps.tickets.empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    ${(c.price_cents / 100).toLocaleString(numLocale)} MXN
                    {c.distance_km ? ` · ${c.distance_km} km` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={savingCategory}
                  onClick={() => void handleDelete(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

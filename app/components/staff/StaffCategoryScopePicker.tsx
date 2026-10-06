import { useId, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { EventExtraScopeType, StaffEventCategory } from "@shared/api";

export function normalizeCategoryScopeType(
  raw: string | null | undefined,
): EventExtraScopeType {
  return raw === "selected_categories" ? "selected_categories" : "all_categories";
}

export type CategoryScopeLabelKeys = {
  title?: string;
  all?: string;
  selected?: string;
  empty?: string;
};

export interface StaffCategoryScopePickerProps {
  /** Unique HTML radio group name — required when rendering multiple pickers on one page. */
  groupName?: string;
  scopeType: EventExtraScopeType | string | null | undefined;
  categoryIds: number[];
  categories: StaffEventCategory[];
  onChange: (patch: {
    scope_type: EventExtraScopeType;
    category_ids?: number[];
  }) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  /** Override default extras-oriented i18n keys (e.g. folio rules). */
  labelKeys?: CategoryScopeLabelKeys;
  /** Optional empty-state action (e.g. link to ticket types). */
  emptyAction?: ReactNode;
}

export default function StaffCategoryScopePicker({
  groupName,
  scopeType,
  categoryIds,
  categories,
  onChange,
  t,
  labelKeys,
  emptyAction,
}: StaffCategoryScopePickerProps) {
  const autoId = useId();
  const radioName = groupName ?? `category-scope-${autoId}`;
  const normalizedScope = normalizeCategoryScopeType(scopeType);

  const titleKey = labelKeys?.title ?? "staffPortal.eventEdit.extraScopeTitle";
  const allKey = labelKeys?.all ?? "staffPortal.eventEdit.extraScopeAll";
  const selectedKey =
    labelKeys?.selected ?? "staffPortal.eventEdit.extraScopeSelected";
  const emptyKey =
    labelKeys?.empty ?? "staffPortal.eventEdit.extraScopeNoCategories";

  const activeCategories = categories.filter(
    (c) => c.is_active !== 0 && c.is_active !== false,
  );

  const toggleCategory = (categoryId: number, checked: boolean) => {
    const set = new Set(categoryIds);
    if (checked) set.add(categoryId);
    else set.delete(categoryId);
    onChange({ scope_type: "selected_categories", category_ids: [...set] });
  };

  return (
    <div className="space-y-2 rounded-md border border-border/70 p-2.5">
      <Label className="text-xs">{t(titleKey)}</Label>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={radioName}
            checked={normalizedScope === "all_categories"}
            onChange={() =>
              onChange({ scope_type: "all_categories", category_ids: [] })
            }
          />
          {t(allKey)}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={radioName}
            checked={normalizedScope === "selected_categories"}
            disabled={activeCategories.length === 0}
            onChange={() => onChange({ scope_type: "selected_categories" })}
          />
          {t(selectedKey)}
        </label>
      </div>
      {activeCategories.length === 0
        ? (emptyAction ?? (
            <p className="text-xs text-muted-foreground">{t(emptyKey)}</p>
          ))
        : null}
      {normalizedScope === "selected_categories" && activeCategories.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 pt-1">
          {activeCategories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={categoryIds.includes(cat.id)}
                onCheckedChange={(checked) =>
                  toggleCategory(cat.id, checked === true)
                }
              />
              {cat.name}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

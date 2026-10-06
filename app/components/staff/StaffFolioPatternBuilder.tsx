import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  FOLIO_PATTERN_PRESETS,
  FOLIO_PATTERN_TOKEN_IDS,
  folioPatternPreview,
  normalizeFolioPatternParts,
  type FolioPatternPart,
  type FolioPatternTokenId,
} from "@shared/folioSegments";

export interface StaffFolioPatternBuilderProps {
  prefixValue: string;
  categoryCode: string;
  patternTokens: FolioPatternPart[];
  seqPadding: number;
  onPrefixChange: (value: string) => void;
  onCategoryCodeChange: (value: string) => void;
  onPatternChange: (parts: FolioPatternPart[]) => void;
  onSeqPaddingChange: (value: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  /**
   * `full` — classic editor (presets + tokens + preview).
   * `advanced` — token list only (wizard hosts presets/preview).
   * `presets` — prefix/code + preset cards + optional advanced disclosure.
   */
  mode?: "full" | "advanced" | "presets";
  className?: string;
  /** Sequence used in live preview (defaults to 1). */
  previewSequence?: number;
}

export const FOLIO_PATTERN_TOKEN_LABEL_KEYS: Record<FolioPatternTokenId, string> = {
  PREFIX: "staffPortal.folioSegments.tokenPrefix",
  CAT: "staffPortal.folioSegments.tokenCat",
  YEAR: "staffPortal.folioSegments.tokenYear",
  COUPON: "staffPortal.folioSegments.tokenCoupon",
  SEQ: "staffPortal.folioSegments.tokenSeq",
  EVENT: "staffPortal.folioSegments.tokenEvent",
};

function movePart(
  parts: FolioPatternPart[],
  index: number,
  direction: -1 | 1,
): FolioPatternPart[] {
  const next = [...parts];
  const target = index + direction;
  if (target < 0 || target >= next.length) return parts;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function folioPatternPartsEqual(
  a: FolioPatternPart[],
  b: FolioPatternPart[],
): boolean {
  const left = normalizeFolioPatternParts(a);
  const right = normalizeFolioPatternParts(b);
  if (left.length !== right.length) return false;
  return left.every((part, i) => {
    const other = right[i];
    if (part.kind !== other.kind) return false;
    if (part.kind === "literal" && other.kind === "literal") {
      return part.value === other.value;
    }
    if (part.kind === "token" && other.kind === "token") {
      return part.token === other.token;
    }
    return false;
  });
}

export function matchingFolioPresetId(
  parts: FolioPatternPart[],
): string | null {
  const normalized = normalizeFolioPatternParts(parts);
  for (const preset of FOLIO_PATTERN_PRESETS) {
    if (folioPatternPartsEqual(normalized, preset.parts)) return preset.id;
  }
  return null;
}

function patternUsesToken(
  parts: FolioPatternPart[],
  token: FolioPatternTokenId,
): boolean {
  return normalizeFolioPatternParts(parts).some(
    (p) => p.kind === "token" && p.token === token,
  );
}

export default function StaffFolioPatternBuilder({
  prefixValue,
  categoryCode,
  patternTokens,
  seqPadding,
  onPrefixChange,
  onCategoryCodeChange,
  onPatternChange,
  onSeqPaddingChange,
  t,
  mode = "full",
  className,
  previewSequence = 1,
}: StaffFolioPatternBuilderProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const preview = folioPatternPreview(
    {
      prefix_value: prefixValue,
      category_code: categoryCode,
      pattern_tokens: patternTokens,
      seq_padding: seqPadding,
    },
    { sequence: previewSequence },
  );
  const activePresetId = matchingFolioPresetId(patternTokens);
  const showPrefix = patternUsesToken(patternTokens, "PREFIX");
  const showCat = patternUsesToken(patternTokens, "CAT");

  const addToken = (token: FolioPatternTokenId) => {
    onPatternChange([...patternTokens, { kind: "token", token }]);
  };

  const addLiteral = () => {
    onPatternChange([...patternTokens, { kind: "literal", value: "-" }]);
  };

  const updateLiteral = (index: number, value: string) => {
    const next = [...patternTokens];
    next[index] = { kind: "literal", value: value.slice(0, 8) };
    onPatternChange(next);
  };

  const removePart = (index: number) => {
    onPatternChange(patternTokens.filter((_, i) => i !== index));
  };

  const valueFields = (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {showPrefix || mode === "full" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staffPortal.folioSegments.prefixValue")}</Label>
          <Input
            value={prefixValue}
            onChange={(e) =>
              onPrefixChange(e.target.value.toUpperCase().slice(0, 24))
            }
            placeholder="RMX"
            className="font-mono h-9"
          />
        </div>
      ) : null}
      {showCat || mode === "full" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staffPortal.folioSegments.categoryCode")}</Label>
          <Input
            value={categoryCode}
            onChange={(e) =>
              onCategoryCodeChange(e.target.value.toUpperCase().slice(0, 24))
            }
            placeholder="5K"
            className="font-mono h-9"
          />
        </div>
      ) : null}
    </div>
  );

  const presetCards = (
    <div className="grid gap-2 sm:grid-cols-2">
      {FOLIO_PATTERN_PRESETS.map((preset) => {
        const sample = folioPatternPreview(
          {
            prefix_value: prefixValue || "RMX",
            category_code: categoryCode || "5K",
            pattern_tokens: preset.parts,
            seq_padding: seqPadding,
          },
          { sequence: previewSequence },
        );
        const selected = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPatternChange(preset.parts)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-primary/40 bg-primary/10"
                : "border-border/70 bg-background hover:bg-muted/30",
            )}
          >
            <span className="block text-xs font-semibold text-foreground">
              {t(preset.labelKey)}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
              {sample}
            </span>
          </button>
        );
      })}
    </div>
  );

  const tokenEditor = (
    <div className="space-y-2.5">
      <Label className="text-xs">{t("staffPortal.folioSegments.patternParts")}</Label>
      {patternTokens.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("staffPortal.folioSegments.patternEmpty")}
        </p>
      ) : (
        <div className="space-y-1.5">
          {patternTokens.map((part, index) => (
            <div
              key={`${index}-${part.kind}`}
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 p-1.5"
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {part.kind === "token" ? (
                <span className="text-xs font-mono flex-1">
                  {t(FOLIO_PATTERN_TOKEN_LABEL_KEYS[part.token])}
                </span>
              ) : (
                <Input
                  className="flex-1 font-mono h-8"
                  value={part.value}
                  onChange={(e) => updateLiteral(index, e.target.value)}
                  placeholder="-"
                />
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                disabled={index === 0}
                onClick={() =>
                  onPatternChange(movePart(patternTokens, index, -1))
                }
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                disabled={index === patternTokens.length - 1}
                onClick={() =>
                  onPatternChange(movePart(patternTokens, index, 1))
                }
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => removePart(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FOLIO_PATTERN_TOKEN_IDS.map((token) => (
          <Button
            key={token}
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => addToken(token)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {t(FOLIO_PATTERN_TOKEN_LABEL_KEYS[token])}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          onClick={addLiteral}
        >
          <Plus className="w-3 h-3 mr-1" />
          {t("staffPortal.folioSegments.addSeparator")}
        </Button>
      </div>
    </div>
  );

  if (mode === "advanced") {
    return <div className={cn("space-y-2.5", className)}>{tokenEditor}</div>;
  }

  if (mode === "presets") {
    return (
      <div className={cn("space-y-3", className)}>
        {valueFields}
        <div className="space-y-1.5">
          <Label className="text-xs">
            {t("staffPortal.folioSegments.wizard.chooseLook")}
          </Label>
          {presetCards}
        </div>
        <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground mb-1">
            {t("staffPortal.folioSegments.preview")}
          </p>
          <p className="font-mono text-base font-semibold tracking-wide text-foreground">
            {preview || "—"}
          </p>
        </div>
        <div className="rounded-md border border-border/60">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/20"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <span>{t("staffPortal.folioSegments.wizard.customizePattern")}</span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 transition-transform",
                advancedOpen && "rotate-180",
              )}
            />
          </button>
          {advancedOpen ? (
            <div className="border-t border-border/60 p-2.5">{tokenEditor}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-border/70 p-2.5",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold">
          {t("staffPortal.folioSegments.patternTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {t("staffPortal.folioSegments.patternSubtitle")}
        </p>
      </div>

      {valueFields}
      {presetCards}
      {tokenEditor}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staffPortal.folioSegments.seqPadding")}</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={seqPadding}
            onChange={(e) =>
              onSeqPaddingChange(
                Math.min(10, Math.max(1, Number(e.target.value) || 5)),
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t("staffPortal.folioSegments.preview")}</Label>
          <div className="h-9 flex items-center rounded-md border border-border/70 bg-muted/30 px-3 font-mono text-sm">
            {preview || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

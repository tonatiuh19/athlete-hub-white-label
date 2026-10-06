/**
 * @vitest-environment jsdom
 */
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import StaffEventFolioSegmentsSection from "@/components/staff/StaffEventFolioSegmentsSection";
import { matchingFolioPresetId } from "@/components/staff/StaffFolioPatternBuilder";
import { createEmptyFolioSegmentDraft } from "@/utils/folioSegmentDraft";
import {
  FOLIO_PATTERN_PRESETS,
  normalizeFolioPatternParts,
} from "@shared/folioSegments";

function wrap(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>{ui}</TooltipProvider>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

describe("folio rule UX helpers", () => {
  it("default draft uses PREFIX-SEQ with hyphen", () => {
    const draft = createEmptyFolioSegmentDraft(0);
    expect(
      matchingFolioPresetId(
        normalizeFolioPatternParts(draft.pattern_tokens ?? []),
      ),
    ).toBe("prefix_seq");
    expect(FOLIO_PATTERN_PRESETS[0]?.id).toBe("prefix_seq");
  });

  it("opens guided wizard from empty state", async () => {
    const user = userEvent.setup();
    wrap(
      <StaffEventFolioSegmentsSection
        eventId={1}
        segments={[]}
        categories={[]}
        discountCodes={[]}
        onSave={vi.fn()}
        t={(key) => i18n.t(key)}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /add rule|agregar regla/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /add folio rule|agregar regla de folio/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/name the rule|nombra la regla/i),
    ).toBeTruthy();
  });

  it("shows collapsed summary with live sample for existing rules", () => {
    wrap(
      <StaffEventFolioSegmentsSection
        eventId={1}
        segments={[
          {
            id: 1,
            event_id: 9,
            name: "General",
            sort_order: 0,
            is_active: true,
            category_scope: "all_categories",
            category_ids: [],
            coupon_scope: "any",
            discount_code_id: null,
            counter_scope: "segment",
            prefix_value: "RMX",
            category_code: "5K",
            pattern_tokens: [
              { kind: "token", token: "PREFIX" },
              { kind: "literal", value: "-" },
              { kind: "token", token: "SEQ" },
            ],
            seq_padding: 5,
            start_number: 1,
            end_number: 100,
            created_at: "",
            updated_at: "",
          },
        ]}
        categories={[]}
        discountCodes={[]}
        onSave={vi.fn()}
        t={(key) => i18n.t(key)}
      />,
    );

    expect(screen.getByText("General")).toBeTruthy();
    expect(screen.getByText("RMX-00001")).toBeTruthy();
    expect(
      screen.queryByText(/choose a format|elige un formato/i),
    ).toBeNull();
  });
});

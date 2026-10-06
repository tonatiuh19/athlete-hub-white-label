/**
 * @vitest-environment jsdom
 */
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import StaffFolioRuleWizardSheet from "@/components/staff/StaffFolioRuleWizardSheet";

function wrap(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>{ui}</TooltipProvider>
      </I18nextProvider>
    </MemoryRouter>,
  );
}

describe("StaffFolioRuleWizardSheet empty dependencies", () => {
  it("renders go-to-coupons empty state when specific_coupon has no active codes", () => {
    wrap(
      <StaffFolioRuleWizardSheet
        open
        onOpenChange={vi.fn()}
        initial={{
          name: "Oxxo comps",
          sort_order: 0,
          is_active: true,
          category_scope: "all_categories",
          category_ids: [],
          coupon_scope: "specific_coupon",
          discount_code_id: null,
          counter_scope: "segment",
          prefix_value: "OX",
          category_code: "",
          pattern_tokens: [
            { kind: "token", token: "PREFIX" },
            { kind: "literal", value: "-" },
            { kind: "token", token: "SEQ" },
          ],
          seq_padding: 5,
          start_number: 1,
          end_number: 100,
        }}
        nextSortOrder={0}
        eventId={42}
        categories={[]}
        discountCodes={[
          {
            id: 9,
            code: "OFF",
            discount_type: "percent",
            discount_value: 10,
            applies_to: "total",
            used_count: 0,
            is_active: 0,
            created_at: "",
          },
        ]}
        onApply={vi.fn()}
        t={(key) => i18n.t(key)}
      />,
    );

    expect(
      screen.getByText(/no active coupons|aún no hay cupones activos/i),
    ).toBeTruthy();
    const link = screen.getByRole("link", {
      name: /go to coupons|ir a cupones/i,
    });
    expect(link.getAttribute("href")).toBe(
      "/staff/events/42/edit?tab=discounts",
    );
  });

  it("links empty ticket types to categories tab", () => {
    wrap(
      <StaffFolioRuleWizardSheet
        open
        onOpenChange={vi.fn()}
        initial={null}
        nextSortOrder={0}
        eventId={7}
        categories={[]}
        discountCodes={[]}
        onApply={vi.fn()}
        t={(key) => i18n.t(key)}
      />,
    );

    const link = screen.getByRole("link", {
      name: /go to ticket types|ir a tipos de boleto/i,
    });
    expect(link.getAttribute("href")).toBe(
      "/staff/events/7/edit?tab=categories",
    );
  });
});

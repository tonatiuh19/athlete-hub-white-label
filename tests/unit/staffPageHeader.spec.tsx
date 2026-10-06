/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffPageHeader from "@/components/staff/StaffPageHeader";
import { Badge } from "@/components/ui/badge";

describe("StaffPageHeader", () => {
  it("allows block/inline badges in subtitle without nesting under <p>", () => {
    const { container } = render(
      <MemoryRouter>
        <StaffPageHeader
          title="Payments"
          subtitle={
            <span className="inline-flex items-center gap-2">
              Finance
              <Badge variant="secondary">Event 42</Badge>
            </span>
          }
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Event 42")).toBeTruthy();
    const subtitle = container.querySelector("header .text-muted-foreground");
    expect(subtitle?.tagName).toBe("DIV");
    expect(container.querySelector("p .inline-flex")).toBeNull();
    expect(screen.getByText("Event 42").tagName).toBe("SPAN");
  });
});

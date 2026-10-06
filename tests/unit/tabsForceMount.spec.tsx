/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("Tabs forceMount", () => {
  it("hides inactive panels while keeping them mounted", () => {
    render(
      <Tabs value="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a" forceMount>
          Panel A
        </TabsContent>
        <TabsContent value="b" forceMount>
          Panel B
        </TabsContent>
      </Tabs>,
    );

    const panelA = screen.getByText("Panel A").closest("[role=tabpanel]");
    const panelB = screen.getByText("Panel B").closest("[role=tabpanel]");

    expect(panelA?.getAttribute("data-state")).toBe("inactive");
    expect(panelA?.className).toContain("data-[state=inactive]:hidden");
    expect(panelB?.getAttribute("data-state")).toBe("active");
    expect(panelB?.hasAttribute("hidden")).toBe(false);
  });
});

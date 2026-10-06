/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EventConsoleHeaderFrame from "@/components/staff/event-console/EventConsoleHeaderFrame";
import EventConsoleSectionHeader from "@/components/staff/event-console/EventConsoleSectionHeader";
import { EventConsoleChromeProvider } from "@/components/staff/event-console/EventConsoleChromeContext";
import { resolveApexHostname } from "@/utils/hostContext";

describe("EventConsoleSectionHeader", () => {
  it("renders inline outside the console chrome host", () => {
    const apex = resolveApexHostname();
    render(
      <EventConsoleSectionHeader
        title="Resumen"
        badge={<span>Draft</span>}
        subdomain="endgame"
        subdomainLive={false}
        actions={<button type="button">Publish</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Resumen" })).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByText(`endgame.${apex}`)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });

  it("portals into the chrome host when provided", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    render(
      <EventConsoleChromeProvider
        hostEl={host}
        mobileMenu={{ open: false, onToggle: () => undefined }}
      >
        <EventConsoleSectionHeader title="Categorías" subdomain="endgame" />
      </EventConsoleChromeProvider>,
    );

    expect(host.querySelector("h1")?.textContent).toBe("Categorías");
    document.body.removeChild(host);
  });
});

describe("EventConsoleHeaderFrame", () => {
  it("links the subdomain when live", () => {
    const apex = resolveApexHostname();
    render(
      <EventConsoleHeaderFrame
        title="Detalles"
        subdomain="endgame"
        subdomainLive
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`https://endgame.${apex}`);
  });
});

// @vitest-environment jsdom
/**
 * Regression: org name must survive city selection.
 * GeoCitySelector patches Redux mid-step; Formik enableReinitialize used to wipe name.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import organizerSignupReducer from "@/store/slices/organizerSignupSlice";
import geoReducer from "@/store/slices/geoSlice";
import marketplaceReducer from "@/store/slices/marketplaceSlice";
import staffAuthReducer from "@/store/slices/staffAuthSlice";
import OrganizerSignupWizard from "@/pages/organizers/OrganizerSignupWizard";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "es" },
    }),
  };
});

vi.mock("@/components/MetaHelmet", () => ({
  default: () => null,
}));

vi.mock("@/components/geo/GeoCitySelector", () => ({
  default: ({
    onChange,
  }: {
    onChange: (sel: {
      stateId: number;
      geoCityId: number;
      city: string;
      state: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          stateId: 14,
          geoCityId: 99,
          city: "Lagos de Moreno",
          state: "Jalisco",
        })
      }
    >
      Pick city
    </button>
  ),
}));

function renderWizard() {
  const store = configureStore({
    reducer: {
      organizerSignup: organizerSignupReducer,
      geo: geoReducer,
      marketplace: marketplaceReducer,
      staffAuth: staffAuthReducer,
    },
    preloadedState: {
      organizerSignup: {
        step: "organization" as const,
        form: {
          ownerFirstName: "Felix",
          ownerLastName: "Gomez",
          ownerEmail: "felix@example.com",
          ownerPhone: "",
          name: "",
          email: "",
          phone: "",
          city: "",
          geoStateId: null,
          geoCityId: null,
          sportTypeId: null,
          eventName: "",
          roughDate: "",
          expectedSize: "" as const,
        },
        registering: false,
        registerError: null,
        registeredOrganizer: null,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/organizers/signup"]}>
        <OrganizerSignupWizard />
      </MemoryRouter>
    </Provider>,
  );

  return store;
}

describe("OrganizerSignupWizard organization step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps typed org name after selecting a city", async () => {
    const user = userEvent.setup();
    const store = renderWizard();

    const nameInput = screen.getByLabelText(
      "organizerSignup.organization.name",
    ) as HTMLInputElement;
    await user.type(nameInput, "Aventours HS");
    expect(nameInput.value).toBe("Aventours HS");

    await user.click(screen.getByRole("button", { name: "Pick city" }));

    expect(
      (screen.getByLabelText("organizerSignup.organization.name") as HTMLInputElement)
        .value,
    ).toBe("Aventours HS");
    expect(store.getState().organizerSignup.form.name).toBe("Aventours HS");
    expect(store.getState().organizerSignup.form.city).toBe("Lagos de Moreno");
    expect(store.getState().organizerSignup.form.geoCityId).toBe(99);
  });
});

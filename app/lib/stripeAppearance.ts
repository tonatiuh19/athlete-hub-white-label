import type { Appearance } from "@stripe/stripe-js";

/** Stripe Elements appearance — Atleita light-only evergreen tokens. */
export function buildStripeAppearance(_isDark = false): Appearance {
  return {
    theme: "stripe",
    variables: {
      colorPrimary: "#214B3A",
      colorBackground: "#ffffff",
      colorText: "#18231F",
      colorDanger: "#ef4444",
      borderRadius: "10px",
      fontFamily: "Archivo, system-ui, sans-serif",
    },
    rules: {
      ".Input": {
        border: "1px solid hsl(150 12% 87%)",
        backgroundColor: "#ffffff",
      },
      ".Tab": {
        border: "1px solid hsl(150 12% 87%)",
      },
      ".Tab--selected": {
        borderColor: "rgba(33, 75, 58, 0.5)",
      },
    },
  };
}

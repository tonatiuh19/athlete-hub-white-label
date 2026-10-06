/** FAQ item keys — copy lives in i18n (`faq.items.<key>`). */
export type FaqItemKey =
  | "howToRegisterForEvent"
  | "groupFamilyRegistration"
  | "guestRegistrationClaim"
  | "waitlistHowItWorks"
  | "waiverRequirement"
  | "registrationExtrasAddons"
  | "discountCodesAtCheckout"
  | "registrationEligibility"
  | "paymentMethodsStripe"
  | "pricesInMxnAndFees"
  | "freeEventRegistration"
  | "refundsAndCancellations"
  | "createAthleteAccount"
  | "completeAthleteProfile"
  | "qrCheckInCode"
  | "transferRegistration"
  | "hostEventOnAtleita"
  | "contactAthleteSupport"
  | "paymentsUnavailableForEvent";

export type FaqCategoryId =
  | "registration"
  | "payments"
  | "account"
  | "organizers"
  | "support";

export type FaqCategory = {
  id: FaqCategoryId;
  itemKeys: FaqItemKey[];
};

/** Curated for home teaser — highest-intent athlete questions. */
export const HOME_FAQ_KEYS: FaqItemKey[] = [
  "howToRegisterForEvent",
  "groupFamilyRegistration",
  "waitlistHowItWorks",
  "qrCheckInCode",
  "paymentMethodsStripe",
  "contactAthleteSupport",
];

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "registration",
    itemKeys: [
      "howToRegisterForEvent",
      "groupFamilyRegistration",
      "guestRegistrationClaim",
      "waitlistHowItWorks",
      "waiverRequirement",
      "registrationExtrasAddons",
      "discountCodesAtCheckout",
      "registrationEligibility",
    ],
  },
  {
    id: "payments",
    itemKeys: [
      "paymentMethodsStripe",
      "pricesInMxnAndFees",
      "freeEventRegistration",
      "refundsAndCancellations",
      "paymentsUnavailableForEvent",
    ],
  },
  {
    id: "account",
    itemKeys: [
      "createAthleteAccount",
      "completeAthleteProfile",
      "qrCheckInCode",
      "transferRegistration",
    ],
  },
  {
    id: "organizers",
    itemKeys: ["hostEventOnAtleita"],
  },
  {
    id: "support",
    itemKeys: ["contactAthleteSupport"],
  },
];

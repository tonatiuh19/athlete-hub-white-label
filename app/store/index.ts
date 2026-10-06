import { configureStore } from "@reduxjs/toolkit";
import athleteAuthReducer from "./slices/athleteAuthSlice";
import staffAuthReducer from "./slices/staffAuthSlice";
import athletePortalReducer from "./slices/athletePortalSlice";
import staffPortalReducer from "./slices/staffPortalSlice";
import marketplaceReducer from "./slices/marketplaceSlice";
import registrationCheckoutReducer from "./slices/registrationCheckoutSlice";
import groupRegistrationReducer from "./slices/groupRegistrationCheckoutSlice";
import paymentMethodsReducer from "./slices/paymentMethodsSlice";
import appConfigReducer from "./slices/appConfigSlice";
import publicHomeReducer from "./slices/publicHomeSlice";
import geoReducer from "./slices/geoSlice";
import organizerSignupReducer from "./slices/organizerSignupSlice";
import publicSiteReducer from "./slices/publicSiteSlice";
import siteAdminReducer from "./slices/siteAdminSlice";
import simulationReducer from "./slices/simulationSlice";
import organizerSiteReducer from "./slices/organizerSiteSlice";

export const store = configureStore({
  reducer: {
    athleteAuth: athleteAuthReducer,
    staffAuth: staffAuthReducer,
    athletePortal: athletePortalReducer,
    staffPortal: staffPortalReducer,
    marketplace: marketplaceReducer,
    registrationCheckout: registrationCheckoutReducer,
    groupRegistration: groupRegistrationReducer,
    paymentMethods: paymentMethodsReducer,
    appConfig: appConfigReducer,
    publicHome: publicHomeReducer,
    geo: geoReducer,
    organizerSignup: organizerSignupReducer,
    publicSite: publicSiteReducer,
    siteAdmin: siteAdminReducer,
    simulation: simulationReducer,
    organizerSite: organizerSiteReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

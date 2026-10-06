import type { AppLocale } from "./i18n.js";
import {
  AUTH_ERROR_I18N_KEYS,
  authErrorMessage,
  type AuthErrorCode,
} from "./authMessages.js";

/** Stable API error codes — client maps via i18n; server returns localized `error` + `code`. */
export type ApiErrorCode =
  | AuthErrorCode
  | "names_required"
  | "date_of_birth_required"
  | "date_of_birth_invalid"
  | "invalid_gender"
  | "password_policy"
  | "reset_code_required"
  | "invalid_or_expired_reset_code"
  | "unauthorized"
  | "session_expired"
  | "forbidden"
  | "not_found"
  | "database_not_configured"
  | "event_not_found"
  | "event_not_live"
  | "category_not_found"
  | "athlete_not_found"
  | "registration_not_found"
  | "payment_not_found"
  | "checkout_not_found"
  | "checkout_outdated"
  | "checkout_expired"
  | "sponsor_not_found"
  | "result_not_found"
  | "order_not_found"
  | "admin_not_found"
  | "organizer_member_not_found"
  | "no_admin_account"
  | "category_sold_out"
  | "category_not_sold_out"
  | "already_registered"
  | "already_on_waitlist"
  | "waitlist_not_enabled"
  | "waiver_required"
  | "payment_unavailable"
  | "payment_init_failed"
  | "payment_not_initialized"
  | "payment_public_uuid_required"
  | "category_id_required"
  | "code_required"
  | "discount_code_required"
  | "invalid_discount_code"
  | "discount_limit_reached"
  | "invalid_extra_selection"
  | "invalid_extra_quantity"
  | "age_requirement_not_met"
  | "gender_requirement_not_met"
  | "phone_in_use"
  | "registration_not_confirmed"
  | "not_your_registration"
  | "cannot_transfer_to_self"
  | "transfers_not_allowed"
  | "recipient_already_registered"
  | "recipient_athlete_not_found"
  | "registration_id_required"
  | "valid_recipient_email_required"
  | "stripe_not_configured"
  | "mercado_pago_not_available"
  | "mercado_pago_not_configured"
  | "mercado_pago_init_failed"
  | "mercado_pago_not_completed"
  | "additional_auth_required"
  | "msi_stripe_only"
  | "msi_not_available"
  | "msi_group_not_available"
  | "installment_update_failed"
  | "organizer_context_missing"
  | "invalid_event_id"
  | "insufficient_permissions"
  | "session_token_required"
  | "idempotency_key_required"
  | "first_name_required"
  | "last_name_required"
  | "phone_too_long"
  | "invalid_shirt_size"
  | "country_required"
  | "city_too_long"
  | "emergency_contact_name_too_long"
  | "emergency_contact_phone_too_long"
  | "preferred_language_or_theme_required"
  | "could_not_send_verification_email"
  | "account_not_found_generic"
  | "invalid_payment_metadata"
  | "payment_not_editable"
  | "invalid_result_id"
  | "invalid_registration_id"
  | "invalid_avatar_data_url"
  | "invalid_avatar_format"
  | "avatar_too_large"
  | "avatar_payload_too_large"
  | "social_account_linked"
  | "social_link_failed"
  | "setup_not_completed"
  | "server_error";

export type ApiSuccessCode =
  | "verification_code_sent"
  | "forgot_password_instructions_sent";

const API_MESSAGES: Record<AppLocale, Record<ApiErrorCode, string>> = {
  en: {
    valid_email_required: authErrorMessage("en", "valid_email_required"),
    email_and_code_required: authErrorMessage("en", "email_and_code_required"),
    email_and_password_required: authErrorMessage(
      "en",
      "email_and_password_required",
    ),
    account_not_found: authErrorMessage("en", "account_not_found"),
    social_account_exists: authErrorMessage("en", "social_account_exists"),
    account_exists: authErrorMessage("en", "account_exists"),
    invalid_or_expired_code: authErrorMessage("en", "invalid_or_expired_code"),
    invalid_credentials: authErrorMessage("en", "invalid_credentials"),
    otp_required: authErrorMessage("en", "otp_required"),
    rate_limited: authErrorMessage("en", "rate_limited"),
    clerk_not_configured: authErrorMessage("en", "clerk_not_configured"),
    invalid_clerk_session: authErrorMessage("en", "invalid_clerk_session"),
    profile_incomplete: authErrorMessage("en", "profile_incomplete"),
    staff_account_not_found: authErrorMessage("en", "staff_account_not_found"),
    organizer_account_not_found: authErrorMessage(
      "en",
      "organizer_account_not_found",
    ),
    generic: authErrorMessage("en", "generic"),
    names_required: "First and last name required",
    date_of_birth_required: "date_of_birth required (YYYY-MM-DD)",
    date_of_birth_invalid: "date_of_birth must be YYYY-MM-DD",
    invalid_gender: "invalid gender",
    password_policy: "Password does not meet security requirements",
    reset_code_required: "Valid 6-digit reset code required",
    invalid_or_expired_reset_code: "Invalid or expired reset code",
    unauthorized: "Unauthorized",
    session_expired: "Session expired",
    forbidden: "Forbidden",
    not_found: "Not found",
    database_not_configured: "Database not configured",
    event_not_found: "Event not found",
    event_not_live: "Event not live",
    category_not_found: "Category not found",
    athlete_not_found: "Athlete not found",
    registration_not_found: "Registration not found",
    payment_not_found: "Payment not found",
    checkout_not_found: "Checkout not found",
    checkout_outdated: "This checkout session is outdated. Please start again.",
    checkout_expired: "Checkout session expired — please start again",
    sponsor_not_found: "Sponsor not found",
    result_not_found: "Result not found",
    order_not_found: "Order not found",
    admin_not_found: "Admin not found",
    organizer_member_not_found: "Organizer member not found",
    no_admin_account: "No admin account found.",
    category_sold_out: "Category is sold out",
    category_not_sold_out: "Category is not sold out",
    already_registered: "Already registered for this event",
    already_on_waitlist: "Already on waitlist for this category",
    waitlist_not_enabled: "Waitlist is not enabled for this category",
    waiver_required: "Waiver acceptance required",
    payment_unavailable: "Payment service unavailable",
    payment_init_failed: "Could not initialize payment. Please try again.",
    payment_not_initialized: "Payment not initialized",
    payment_public_uuid_required: "paymentPublicUuid required",
    category_id_required: "categoryId required",
    code_required: "code required",
    discount_code_required: "Discount code required",
    invalid_discount_code: "Invalid or expired discount code",
    discount_limit_reached: "Discount code has reached its usage limit",
    invalid_extra_selection: "Invalid extra selection",
    invalid_extra_quantity: "Invalid extra quantity",
    age_requirement_not_met:
      "You do not meet the age requirements for this category",
    gender_requirement_not_met:
      "You do not meet the gender requirements for this category",
    phone_in_use: "Phone number already in use",
    registration_not_confirmed: "Registration is not confirmed",
    not_your_registration: "Not your registration",
    cannot_transfer_to_self: "Cannot transfer to yourself",
    transfers_not_allowed: "Transfers are not allowed for this event",
    recipient_already_registered:
      "Recipient is already registered for this event",
    recipient_athlete_not_found: "Recipient athlete not found",
    registration_id_required: "Registration id required",
    valid_recipient_email_required: "Valid recipientEmail required",
    stripe_not_configured: "Stripe is not configured",
    mercado_pago_not_available: "Mercado Pago is not available",
    mercado_pago_not_configured: "Mercado Pago is not configured",
    mercado_pago_init_failed: "Could not initialize Mercado Pago checkout",
    mercado_pago_not_completed: "Mercado Pago payment is not completed yet",
    additional_auth_required: "Additional authentication required",
    msi_stripe_only: "MSI is only available for Stripe checkout",
    msi_not_available: "MSI is not available for this checkout",
    msi_group_not_available: "MSI is not available for group checkout yet",
    installment_update_failed:
      "Could not update installment plan. Please try again.",
    organizer_context_missing: "Organizer context missing",
    invalid_event_id: "Invalid event id",
    insufficient_permissions: "Insufficient permissions to edit events",
    session_token_required: "sessionToken required",
    idempotency_key_required: "idempotencyKey required (max 64 chars)",
    first_name_required: "first_name required (max 100 characters)",
    last_name_required: "last_name required (max 100 characters)",
    phone_too_long: "phone max 20 characters",
    invalid_shirt_size: "invalid shirt_size",
    country_required: "country required",
    city_too_long: "city max 100 characters",
    emergency_contact_name_too_long:
      "emergency_contact_name max 200 characters",
    emergency_contact_phone_too_long:
      "emergency_contact_phone max 20 characters",
    preferred_language_or_theme_required:
      "preferred_language and/or preferred_theme required",
    could_not_send_verification_email:
      "Could not send verification email. Please try again.",
    account_not_found_generic: "Account not found",
    invalid_payment_metadata: "Invalid payment metadata",
    payment_not_editable: "Payment is no longer editable",
    invalid_result_id: "Invalid result id",
    invalid_registration_id: "Invalid registration id",
    invalid_avatar_data_url: "image must be a data URL (jpeg, png, or webp)",
    invalid_avatar_format: "invalid image format (jpeg, png, webp only)",
    avatar_too_large: "image too large (max 180KB)",
    avatar_payload_too_large: "image payload too large",
    social_account_linked:
      "This social account is already linked to another profile.",
    social_link_failed:
      "Could not link social account. Try email sign-in or contact support.",
    setup_not_completed: "Setup not completed",
    server_error: "A server error has occurred",
  },
  es: {
    valid_email_required: authErrorMessage("es", "valid_email_required"),
    email_and_code_required: authErrorMessage("es", "email_and_code_required"),
    email_and_password_required: authErrorMessage(
      "es",
      "email_and_password_required",
    ),
    account_not_found: authErrorMessage("es", "account_not_found"),
    social_account_exists: authErrorMessage("es", "social_account_exists"),
    account_exists: authErrorMessage("es", "account_exists"),
    invalid_or_expired_code: authErrorMessage("es", "invalid_or_expired_code"),
    invalid_credentials: authErrorMessage("es", "invalid_credentials"),
    otp_required: authErrorMessage("es", "otp_required"),
    rate_limited: authErrorMessage("es", "rate_limited"),
    clerk_not_configured: authErrorMessage("es", "clerk_not_configured"),
    invalid_clerk_session: authErrorMessage("es", "invalid_clerk_session"),
    profile_incomplete: authErrorMessage("es", "profile_incomplete"),
    staff_account_not_found: authErrorMessage("es", "staff_account_not_found"),
    organizer_account_not_found: authErrorMessage(
      "es",
      "organizer_account_not_found",
    ),
    generic: authErrorMessage("es", "generic"),
    names_required: "Se requieren nombre y apellido",
    date_of_birth_required: "Se requiere fecha de nacimiento (AAAA-MM-DD)",
    date_of_birth_invalid: "La fecha de nacimiento debe ser AAAA-MM-DD",
    invalid_gender: "Género inválido",
    password_policy: "La contraseña no cumple los requisitos de seguridad",
    reset_code_required: "Se requiere un código de restablecimiento de 6 dígitos",
    invalid_or_expired_reset_code: "Código de restablecimiento inválido o expirado",
    unauthorized: "No autorizado",
    session_expired: "Sesión expirada",
    forbidden: "Prohibido",
    not_found: "No encontrado",
    database_not_configured: "Base de datos no configurada",
    event_not_found: "Evento no encontrado",
    event_not_live: "El evento no está publicado",
    category_not_found: "Categoría no encontrada",
    athlete_not_found: "Atleta no encontrado",
    registration_not_found: "Inscripción no encontrada",
    payment_not_found: "Pago no encontrado",
    checkout_not_found: "Checkout no encontrado",
    checkout_outdated:
      "Esta sesión de pago está desactualizada. Empieza de nuevo.",
    checkout_expired: "La sesión de pago expiró — empieza de nuevo",
    sponsor_not_found: "Patrocinador no encontrado",
    result_not_found: "Resultado no encontrado",
    order_not_found: "Pedido no encontrado",
    admin_not_found: "Administrador no encontrado",
    organizer_member_not_found: "Miembro organizador no encontrado",
    no_admin_account: "No hay cuenta de administrador.",
    category_sold_out: "La categoría está agotada",
    category_not_sold_out: "La categoría no está agotada",
    already_registered: "Ya estás inscrito en este evento",
    already_on_waitlist: "Ya estás en la lista de espera de esta categoría",
    waitlist_not_enabled: "La lista de espera no está habilitada para esta categoría",
    waiver_required: "Se requiere aceptar la carta responsiva",
    payment_unavailable: "Servicio de pago no disponible",
    payment_init_failed: "No se pudo iniciar el pago. Intenta de nuevo.",
    payment_not_initialized: "Pago no inicializado",
    payment_public_uuid_required: "Se requiere paymentPublicUuid",
    category_id_required: "Se requiere categoryId",
    code_required: "Se requiere código",
    discount_code_required: "Se requiere código de descuento",
    invalid_discount_code: "Código de descuento inválido o expirado",
    discount_limit_reached: "El código de descuento alcanzó su límite de uso",
    invalid_extra_selection: "Selección de extra inválida",
    invalid_extra_quantity: "Cantidad de extra inválida",
    age_requirement_not_met:
      "No cumples los requisitos de edad para esta categoría",
    gender_requirement_not_met:
      "No cumples los requisitos de género para esta categoría",
    phone_in_use: "El número de teléfono ya está en uso",
    registration_not_confirmed: "La inscripción no está confirmada",
    not_your_registration: "No es tu inscripción",
    cannot_transfer_to_self: "No puedes transferirte a ti mismo",
    transfers_not_allowed: "Las transferencias no están permitidas para este evento",
    recipient_already_registered:
      "El destinatario ya está inscrito en este evento",
    recipient_athlete_not_found: "Atleta destinatario no encontrado",
    registration_id_required: "Se requiere el id de inscripción",
    valid_recipient_email_required: "Se requiere un recipientEmail válido",
    stripe_not_configured: "Stripe no está configurado",
    mercado_pago_not_available: "Mercado Pago no está disponible",
    mercado_pago_not_configured: "Mercado Pago no está configurado",
    mercado_pago_init_failed: "No se pudo iniciar el checkout de Mercado Pago",
    mercado_pago_not_completed: "El pago de Mercado Pago aún no está completado",
    additional_auth_required: "Se requiere autenticación adicional",
    msi_stripe_only: "MSI solo está disponible con checkout de Stripe",
    msi_not_available: "MSI no está disponible para este checkout",
    msi_group_not_available: "MSI aún no está disponible para checkout grupal",
    installment_update_failed:
      "No se pudo actualizar el plan de meses. Intenta de nuevo.",
    organizer_context_missing: "Falta el contexto del organizador",
    invalid_event_id: "Id de evento inválido",
    insufficient_permissions: "Permisos insuficientes para editar eventos",
    session_token_required: "Se requiere sessionToken",
    idempotency_key_required: "Se requiere idempotencyKey (máx. 64 caracteres)",
    first_name_required: "Se requiere first_name (máx. 100 caracteres)",
    last_name_required: "Se requiere last_name (máx. 100 caracteres)",
    phone_too_long: "Teléfono: máximo 20 caracteres",
    invalid_shirt_size: "Talla de playera inválida",
    country_required: "Se requiere país",
    city_too_long: "Ciudad: máximo 100 caracteres",
    emergency_contact_name_too_long:
      "Nombre de contacto de emergencia: máximo 200 caracteres",
    emergency_contact_phone_too_long:
      "Teléfono de contacto de emergencia: máximo 20 caracteres",
    preferred_language_or_theme_required:
      "Se requiere preferred_language y/o preferred_theme",
    could_not_send_verification_email:
      "No se pudo enviar el correo de verificación. Intenta de nuevo.",
    account_not_found_generic: "Cuenta no encontrada",
    invalid_payment_metadata: "Metadatos de pago inválidos",
    payment_not_editable: "El pago ya no se puede editar",
    invalid_result_id: "Id de resultado inválido",
    invalid_registration_id: "Id de inscripción inválido",
    invalid_avatar_data_url:
      "La imagen debe ser un data URL (solo jpeg, png o webp)",
    invalid_avatar_format: "Formato de imagen inválido (solo jpeg, png, webp)",
    avatar_too_large: "Imagen demasiado grande (máx. 180KB)",
    avatar_payload_too_large: "La imagen es demasiado grande",
    social_account_linked:
      "Esta cuenta social ya está vinculada a otro perfil.",
    social_link_failed:
      "No se pudo vincular la cuenta social. Prueba con correo o contacta soporte.",
    setup_not_completed: "Configuración incompleta",
    server_error: "Ocurrió un error en el servidor",
  },
};

const SUCCESS_MESSAGES: Record<AppLocale, Record<ApiSuccessCode, string>> = {
  en: {
    verification_code_sent: "Verification code sent.",
    forgot_password_instructions_sent:
      "If an account exists for that email, we sent sign-in or password reset instructions.",
  },
  es: {
    verification_code_sent: "Código de verificación enviado.",
    forgot_password_instructions_sent:
      "Si existe una cuenta con ese correo, enviamos instrucciones de acceso o restablecimiento.",
  },
};

export function apiErrorMessage(
  locale: AppLocale,
  code: ApiErrorCode,
): string {
  return API_MESSAGES[locale][code] ?? API_MESSAGES.es.generic;
}

export function apiSuccessMessage(
  locale: AppLocale,
  code: ApiSuccessCode,
): string {
  return SUCCESS_MESSAGES[locale][code] ?? SUCCESS_MESSAGES.es.verification_code_sent;
}

/** i18n keys under `api.errors.*` / `api.success.*` (plus auth.errors for AuthErrorCode). */
export const API_ERROR_I18N_KEYS: Record<ApiErrorCode, string> = {
  ...AUTH_ERROR_I18N_KEYS,
  names_required: "api.errors.namesRequired",
  date_of_birth_required: "api.errors.dateOfBirthRequired",
  date_of_birth_invalid: "api.errors.dateOfBirthInvalid",
  invalid_gender: "api.errors.invalidGender",
  password_policy: "api.errors.passwordPolicy",
  reset_code_required: "api.errors.resetCodeRequired",
  invalid_or_expired_reset_code: "api.errors.invalidOrExpiredResetCode",
  unauthorized: "api.errors.unauthorized",
  session_expired: "api.errors.sessionExpired",
  forbidden: "api.errors.forbidden",
  not_found: "api.errors.notFound",
  database_not_configured: "api.errors.databaseNotConfigured",
  event_not_found: "api.errors.eventNotFound",
  event_not_live: "api.errors.eventNotLive",
  category_not_found: "api.errors.categoryNotFound",
  athlete_not_found: "api.errors.athleteNotFound",
  registration_not_found: "api.errors.registrationNotFound",
  payment_not_found: "api.errors.paymentNotFound",
  checkout_not_found: "api.errors.checkoutNotFound",
  checkout_outdated: "api.errors.checkoutOutdated",
  checkout_expired: "api.errors.checkoutExpired",
  sponsor_not_found: "api.errors.sponsorNotFound",
  result_not_found: "api.errors.resultNotFound",
  order_not_found: "api.errors.orderNotFound",
  admin_not_found: "api.errors.adminNotFound",
  organizer_member_not_found: "api.errors.organizerMemberNotFound",
  no_admin_account: "api.errors.noAdminAccount",
  category_sold_out: "api.errors.categorySoldOut",
  category_not_sold_out: "api.errors.categoryNotSoldOut",
  already_registered: "api.errors.alreadyRegistered",
  already_on_waitlist: "api.errors.alreadyOnWaitlist",
  waitlist_not_enabled: "api.errors.waitlistNotEnabled",
  waiver_required: "api.errors.waiverRequired",
  payment_unavailable: "api.errors.paymentUnavailable",
  payment_init_failed: "api.errors.paymentInitFailed",
  payment_not_initialized: "api.errors.paymentNotInitialized",
  payment_public_uuid_required: "api.errors.paymentPublicUuidRequired",
  category_id_required: "api.errors.categoryIdRequired",
  code_required: "api.errors.codeRequired",
  discount_code_required: "api.errors.discountCodeRequired",
  invalid_discount_code: "api.errors.invalidDiscountCode",
  discount_limit_reached: "api.errors.discountLimitReached",
  invalid_extra_selection: "api.errors.invalidExtraSelection",
  invalid_extra_quantity: "api.errors.invalidExtraQuantity",
  age_requirement_not_met: "api.errors.ageRequirementNotMet",
  gender_requirement_not_met: "api.errors.genderRequirementNotMet",
  phone_in_use: "api.errors.phoneInUse",
  registration_not_confirmed: "api.errors.registrationNotConfirmed",
  not_your_registration: "api.errors.notYourRegistration",
  cannot_transfer_to_self: "api.errors.cannotTransferToSelf",
  transfers_not_allowed: "api.errors.transfersNotAllowed",
  recipient_already_registered: "api.errors.recipientAlreadyRegistered",
  recipient_athlete_not_found: "api.errors.recipientAthleteNotFound",
  registration_id_required: "api.errors.registrationIdRequired",
  valid_recipient_email_required: "api.errors.validRecipientEmailRequired",
  stripe_not_configured: "api.errors.stripeNotConfigured",
  mercado_pago_not_available: "api.errors.mercadoPagoNotAvailable",
  mercado_pago_not_configured: "api.errors.mercadoPagoNotConfigured",
  mercado_pago_init_failed: "api.errors.mercadoPagoInitFailed",
  mercado_pago_not_completed: "api.errors.mercadoPagoNotCompleted",
  additional_auth_required: "api.errors.additionalAuthRequired",
  msi_stripe_only: "api.errors.msiStripeOnly",
  msi_not_available: "api.errors.msiNotAvailable",
  msi_group_not_available: "api.errors.msiGroupNotAvailable",
  installment_update_failed: "api.errors.installmentUpdateFailed",
  organizer_context_missing: "api.errors.organizerContextMissing",
  invalid_event_id: "api.errors.invalidEventId",
  insufficient_permissions: "api.errors.insufficientPermissions",
  session_token_required: "api.errors.sessionTokenRequired",
  idempotency_key_required: "api.errors.idempotencyKeyRequired",
  first_name_required: "api.errors.firstNameRequired",
  last_name_required: "api.errors.lastNameRequired",
  phone_too_long: "api.errors.phoneTooLong",
  invalid_shirt_size: "api.errors.invalidShirtSize",
  country_required: "api.errors.countryRequired",
  city_too_long: "api.errors.cityTooLong",
  emergency_contact_name_too_long: "api.errors.emergencyContactNameTooLong",
  emergency_contact_phone_too_long: "api.errors.emergencyContactPhoneTooLong",
  preferred_language_or_theme_required:
    "api.errors.preferredLanguageOrThemeRequired",
  could_not_send_verification_email: "api.errors.couldNotSendVerificationEmail",
  account_not_found_generic: "api.errors.accountNotFoundGeneric",
  invalid_payment_metadata: "api.errors.invalidPaymentMetadata",
  payment_not_editable: "api.errors.paymentNotEditable",
  invalid_result_id: "api.errors.invalidResultId",
  invalid_registration_id: "api.errors.invalidRegistrationId",
  invalid_avatar_data_url: "api.errors.invalidAvatarDataUrl",
  invalid_avatar_format: "api.errors.invalidAvatarFormat",
  avatar_too_large: "api.errors.avatarTooLarge",
  avatar_payload_too_large: "api.errors.avatarPayloadTooLarge",
  social_account_linked: "api.errors.socialAccountLinked",
  social_link_failed: "api.errors.socialLinkFailed",
  setup_not_completed: "api.errors.setupNotCompleted",
  server_error: "api.errors.serverError",
};

export const API_SUCCESS_I18N_KEYS: Record<ApiSuccessCode, string> = {
  verification_code_sent: "api.success.verificationCodeSent",
  forgot_password_instructions_sent: "api.success.forgotPasswordInstructionsSent",
};

/** Map legacy English error strings → codes when `code` is absent. */
export const API_ERROR_STRING_TO_CODE: Array<[RegExp, ApiErrorCode]> = [
  [/first and last name required/i, "names_required"],
  [/se requieren nombre y apellido/i, "names_required"],
  [/date_of_birth required/i, "date_of_birth_required"],
  [/date_of_birth must be/i, "date_of_birth_invalid"],
  [/invalid gender|género inválido/i, "invalid_gender"],
  [/password does not meet|contraseña no cumple/i, "password_policy"],
  [/6-digit reset code|código de restablecimiento de 6/i, "reset_code_required"],
  [/invalid or expired reset code|código de restablecimiento inválido/i, "invalid_or_expired_reset_code"],
  [/^unauthorized$|^no autorizado$/i, "unauthorized"],
  [/session expired|sesión expirada/i, "session_expired"],
  [/event not found|evento no encontrado/i, "event_not_found"],
  [/event not live|evento no está publicado/i, "event_not_live"],
  [/category not found|categoría no encontrada/i, "category_not_found"],
  [/athlete not found|atleta no encontrado/i, "athlete_not_found"],
  [/registration not found|inscripción no encontrada/i, "registration_not_found"],
  [/payment not found|pago no encontrado/i, "payment_not_found"],
  [/checkout not found|checkout no encontrado/i, "checkout_not_found"],
  [/checkout session is outdated|sesión de pago está desactualizada/i, "checkout_outdated"],
  [/checkout session expired|sesión de pago expiró/i, "checkout_expired"],
  [/category is sold out|categoría está agotada/i, "category_sold_out"],
  [/already registered for this event|ya estás inscrito/i, "already_registered"],
  [/waiver acceptance required|aceptar la carta responsiva/i, "waiver_required"],
  [/payment service unavailable|servicio de pago no disponible/i, "payment_unavailable"],
  [/could not initialize payment|no se pudo iniciar el pago/i, "payment_init_failed"],
  [/phone number already in use|teléfono ya está en uso/i, "phone_in_use"],
  [/stripe is not configured|stripe no está configurado/i, "stripe_not_configured"],
  [/mercado pago is not available|mercado pago no está disponible/i, "mercado_pago_not_available"],
  [/you do not meet the age|no cumples los requisitos de edad/i, "age_requirement_not_met"],
  [/you do not meet the gender|no cumples los requisitos de género/i, "gender_requirement_not_met"],
];

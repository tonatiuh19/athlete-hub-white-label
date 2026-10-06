import { useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Loader2, Lock, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FieldGroup,
  FieldRow,
  SectionShell,
  ToggleRow,
} from "@/components/staff/event-edit/primitives";
import { Button } from "@/components/ui/button";
import { ConsentCheck } from "@/components/ui/consent-check";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { uploadEventAssetToCdn } from "@/lib/cdn-upload";
import { useAppDispatch } from "@/store/hooks";
import {
  createOrganizerPayoutAccount,
  submitOrganizerPayoutAccount,
  updateOrganizerPayoutAccount,
} from "@/store/slices/staffPortalSlice";
import type {
  OrganizerPayoutAccountPublic,
  OrganizerPayoutAccountUpsertRequest,
  OrganizerPayoutPersonType,
} from "@shared/api";
import {
  MX_TAX_REGIMES_PERSONA_FISICA,
  MX_TAX_REGIMES_PERSONA_MORAL,
  bankNameFromClabe,
  isValidClabe,
  normalizeClabe,
} from "@shared/clabe";

const MX_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

type FormValues = {
  nickname: string;
  holder_name: string;
  clabe: string;
  bank_name: string;
  person_type: OrganizerPayoutPersonType;
  legal_name: string;
  tax_regime: string;
  rfc: string;
  curp: string;
  fiscal_street: string;
  fiscal_ext_number: string;
  fiscal_int_number: string;
  fiscal_neighborhood: string;
  fiscal_city: string;
  fiscal_municipality: string;
  fiscal_state: string;
  fiscal_postal_code: string;
  phone: string;
  invoice_email: string;
  constancia_url: string;
  bank_statement_url: string;
  is_default: boolean;
  confirm_correct: boolean;
};

function accountToValues(account?: OrganizerPayoutAccountPublic | null): FormValues {
  return {
    nickname: account?.nickname ?? "",
    holder_name: account?.holder_name ?? "",
    clabe: "",
    bank_name: account?.bank_name ?? "",
    person_type: account?.person_type ?? "persona_fisica",
    legal_name: account?.legal_name ?? "",
    tax_regime: account?.tax_regime ?? "",
    rfc: account?.rfc ?? "",
    curp: account?.curp ?? "",
    fiscal_street: account?.fiscal_street ?? "",
    fiscal_ext_number: account?.fiscal_ext_number ?? "",
    fiscal_int_number: account?.fiscal_int_number ?? "",
    fiscal_neighborhood: account?.fiscal_neighborhood ?? "",
    fiscal_city: account?.fiscal_city ?? "",
    fiscal_municipality: account?.fiscal_municipality ?? "",
    fiscal_state: account?.fiscal_state ?? "",
    fiscal_postal_code: account?.fiscal_postal_code ?? "",
    phone: account?.phone ?? "",
    invoice_email: account?.invoice_email ?? "",
    constancia_url: account?.constancia_url ?? "",
    bank_statement_url: account?.bank_statement_url ?? "",
    is_default: account?.is_default ?? true,
    confirm_correct: false,
  };
}

function valuesToBody(values: FormValues): OrganizerPayoutAccountUpsertRequest {
  const body: OrganizerPayoutAccountUpsertRequest = {
    nickname: values.nickname.trim(),
    holder_name: values.holder_name.trim(),
    bank_name: values.bank_name.trim() || null,
    person_type: values.person_type,
    legal_name: values.legal_name.trim(),
    tax_regime: values.tax_regime.trim() || null,
    rfc: values.rfc.trim().toUpperCase() || null,
    curp: values.curp.trim().toUpperCase() || null,
    fiscal_street: values.fiscal_street.trim() || null,
    fiscal_ext_number: values.fiscal_ext_number.trim() || null,
    fiscal_int_number: values.fiscal_int_number.trim() || null,
    fiscal_neighborhood: values.fiscal_neighborhood.trim() || null,
    fiscal_city: values.fiscal_city.trim() || null,
    fiscal_municipality: values.fiscal_municipality.trim() || null,
    fiscal_state: values.fiscal_state.trim() || null,
    fiscal_postal_code: values.fiscal_postal_code.trim() || null,
    phone: values.phone.replace(/\D/g, "") || null,
    invoice_email: values.invoice_email.trim() || null,
    constancia_url: values.constancia_url.trim() || null,
    bank_statement_url: values.bank_statement_url.trim() || null,
    is_default: values.is_default,
  };
  const clabe = normalizeClabe(values.clabe);
  if (clabe) body.clabe = clabe;
  return body;
}

export default function StaffManualPayoutAccountForm({
  account,
  locked,
  onSaved,
}: {
  account?: OrganizerPayoutAccountPublic | null;
  locked?: boolean;
  onSaved?: (account: OrganizerPayoutAccountPublic) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [uploadingConstancia, setUploadingConstancia] = useState(false);
  const [uploadingStatement, setUploadingStatement] = useState(false);
  const isLocked =
    locked ||
    Boolean(account?.locked_at) ||
    account?.status === "submitted" ||
    account?.status === "verified";

  const validationSchema = useMemo(
    () =>
      Yup.object({
        nickname: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        holder_name: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        clabe: Yup.string().test(
          "clabe",
          t("staffPortal.payoutAccounts.validation.clabe"),
          (value) => {
            if (account?.clabe_last4 && !value) return true;
            return isValidClabe(value || "");
          },
        ),
        bank_name: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        person_type: Yup.mixed<"persona_fisica" | "persona_moral">()
          .oneOf(["persona_fisica", "persona_moral"])
          .required(),
        legal_name: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        tax_regime: Yup.string().required(t("staffPortal.payoutAccounts.validation.required")),
        rfc: Yup.string()
          .trim()
          .required(t("staffPortal.payoutAccounts.validation.required"))
          .matches(
            /^[A-Za-zÑñ&]{3,4}\d{6}[A-Za-z0-9]{3}$/,
            t("staffPortal.payoutAccounts.validation.rfc"),
          ),
        curp: Yup.string().when("person_type", {
          is: "persona_fisica",
          then: (s) =>
            s
              .trim()
              .required(t("staffPortal.payoutAccounts.validation.required"))
              .length(18, t("staffPortal.payoutAccounts.validation.curp")),
          otherwise: (s) => s.trim().nullable(),
        }),
        fiscal_street: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_ext_number: Yup.string()
          .trim()
          .required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_neighborhood: Yup.string()
          .trim()
          .required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_city: Yup.string().trim().required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_municipality: Yup.string()
          .trim()
          .required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_state: Yup.string().required(t("staffPortal.payoutAccounts.validation.required")),
        fiscal_postal_code: Yup.string()
          .matches(/^\d{5}$/, t("staffPortal.payoutAccounts.validation.postalCode"))
          .required(),
        phone: Yup.string()
          .matches(/^\d{10}$/, t("staffPortal.payoutAccounts.validation.phone"))
          .required(),
        invoice_email: Yup.string()
          .email(t("staffPortal.payoutAccounts.validation.email"))
          .required(t("staffPortal.payoutAccounts.validation.required")),
        constancia_url: Yup.string()
          .url(t("staffPortal.payoutAccounts.validation.url"))
          .required(t("staffPortal.payoutAccounts.validation.required")),
        bank_statement_url: Yup.string()
          .url(t("staffPortal.payoutAccounts.validation.url"))
          .required(t("staffPortal.payoutAccounts.validation.required")),
        confirm_correct: Yup.boolean().oneOf(
          [true],
          t("staffPortal.payoutAccounts.validation.confirm"),
        ),
      }),
    [account?.clabe_last4, t],
  );

  const formik = useFormik<FormValues>({
    initialValues: accountToValues(account),
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, helpers) => {
      if (isLocked) return;
      const body = valuesToBody(values);
      try {
        let result;
        if (account?.id) {
          const save = await dispatch(
            updateOrganizerPayoutAccount({ id: account.id, body }),
          );
          if (updateOrganizerPayoutAccount.rejected.match(save)) {
            toast({
              variant: "destructive",
              title: save.payload || t("staffPortal.payoutAccounts.errors.save"),
            });
            return;
          }
          result = await dispatch(
            submitOrganizerPayoutAccount({ id: account.id, body }),
          );
        } else {
          const created = await dispatch(createOrganizerPayoutAccount(body));
          if (createOrganizerPayoutAccount.rejected.match(created)) {
            toast({
              variant: "destructive",
              title:
                created.payload || t("staffPortal.payoutAccounts.errors.save"),
            });
            return;
          }
          const id = created.payload.account.id;
          result = await dispatch(submitOrganizerPayoutAccount({ id, body }));
        }
        if (submitOrganizerPayoutAccount.rejected.match(result)) {
          toast({
            variant: "destructive",
            title:
              result.payload || t("staffPortal.payoutAccounts.errors.submit"),
          });
          return;
        }
        toast({ title: t("staffPortal.payoutAccounts.submitted") });
        onSaved?.(result.payload.account);
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  const taxRegimes =
    formik.values.person_type === "persona_moral"
      ? MX_TAX_REGIMES_PERSONA_MORAL
      : MX_TAX_REGIMES_PERSONA_FISICA;

  const showErr = (key: keyof FormValues) =>
    formik.touched[key] && formik.errors[key]
      ? String(formik.errors[key])
      : undefined;

  const uploadDoc = async (
    file: File,
    kind: "constancia" | "statement",
  ): Promise<void> => {
    const setBusy =
      kind === "constancia" ? setUploadingConstancia : setUploadingStatement;
    setBusy(true);
    try {
      const url = await uploadEventAssetToCdn(
        file,
        `organizer_payout_${kind}_${Date.now()}`,
        false,
        "document",
      );
      if (kind === "constancia") {
        await formik.setFieldValue("constancia_url", url);
      } else {
        await formik.setFieldValue("bank_statement_url", url);
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("staffPortal.payoutAccounts.errors.upload"),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      as="form"
      onSubmit={formik.handleSubmit}
      title={t("staffPortal.payoutAccounts.formTitle")}
      hint={t("staffPortal.payoutAccounts.formHint")}
      className="space-y-3"
    >
      <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground leading-snug">
        {t("staffPortal.payoutAccounts.interbankNotice")}
      </div>

      {isLocked ? (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{t("staffPortal.payoutAccounts.lockedDisclaimer")}</span>
        </div>
      ) : null}

      <FieldGroup title={t("staffPortal.payoutAccounts.sectionBank")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow
            id="opa-nickname"
            label={t("staffPortal.payoutAccounts.nickname")}
            required
            error={showErr("nickname")}
          >
            <Input
              id="opa-nickname"
              name="nickname"
              disabled={isLocked}
              value={formik.values.nickname}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-holder"
            label={t("staffPortal.payoutAccounts.holderName")}
            required
            error={showErr("holder_name")}
          >
            <Input
              id="opa-holder"
              name="holder_name"
              disabled={isLocked}
              value={formik.values.holder_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-clabe"
            label={t("staffPortal.payoutAccounts.clabe")}
            required
            error={showErr("clabe")}
            hint={
              account?.clabe_last4
                ? t("staffPortal.payoutAccounts.clabeLast4Hint", {
                    last4: account.clabe_last4,
                  })
                : undefined
            }
          >
            <Input
              id="opa-clabe"
              name="clabe"
              inputMode="numeric"
              disabled={isLocked}
              placeholder={
                account?.clabe_last4
                  ? `••••••••••••${account.clabe_last4}`
                  : "18 dígitos"
              }
              value={formik.values.clabe}
              onChange={(e) => {
                const raw = e.target.value;
                void formik.setFieldValue("clabe", raw);
                const auto = bankNameFromClabe(raw);
                if (auto) void formik.setFieldValue("bank_name", auto);
              }}
              onBlur={formik.handleBlur}
              className="h-9 font-mono tracking-wide"
            />
          </FieldRow>
          <FieldRow
            id="opa-bank"
            label={t("staffPortal.payoutAccounts.bankName")}
            required
            error={showErr("bank_name")}
          >
            <Input
              id="opa-bank"
              name="bank_name"
              disabled={isLocked}
              value={formik.values.bank_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
        </div>
      </FieldGroup>

      <FieldGroup title={t("staffPortal.payoutAccounts.sectionPerson")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow
            id="opa-person"
            label={t("staffPortal.payoutAccounts.personType")}
            required
          >
            <Select
              disabled={isLocked}
              value={formik.values.person_type}
              onValueChange={(v) => {
                void formik.setFieldValue("person_type", v);
                void formik.setFieldValue("tax_regime", "");
              }}
            >
              <SelectTrigger id="opa-person" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="persona_fisica">
                  {t("staffPortal.payoutAccounts.personaFisica")}
                </SelectItem>
                <SelectItem value="persona_moral">
                  {t("staffPortal.payoutAccounts.personaMoral")}
                </SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            id="opa-legal"
            label={t("staffPortal.payoutAccounts.legalName")}
            required
            error={showErr("legal_name")}
          >
            <Input
              id="opa-legal"
              name="legal_name"
              disabled={isLocked}
              value={formik.values.legal_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
        </div>
      </FieldGroup>

      <FieldGroup title={t("staffPortal.payoutAccounts.sectionTax")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow
            id="opa-regime"
            label={t("staffPortal.payoutAccounts.taxRegime")}
            required
            error={showErr("tax_regime")}
            fullWidth
          >
            <Select
              disabled={isLocked}
              value={formik.values.tax_regime || undefined}
              onValueChange={(v) => void formik.setFieldValue("tax_regime", v)}
            >
              <SelectTrigger id="opa-regime" className="h-9">
                <SelectValue
                  placeholder={t("staffPortal.payoutAccounts.taxRegimePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {taxRegimes.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.code} — {t(r.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            id="opa-rfc"
            label={t("staffPortal.payoutAccounts.rfc")}
            required
            error={showErr("rfc")}
          >
            <Input
              id="opa-rfc"
              name="rfc"
              disabled={isLocked}
              value={formik.values.rfc}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9 uppercase"
            />
          </FieldRow>
          {formik.values.person_type === "persona_fisica" ? (
            <FieldRow
              id="opa-curp"
              label={t("staffPortal.payoutAccounts.curp")}
              required
              error={showErr("curp")}
            >
              <Input
                id="opa-curp"
                name="curp"
                disabled={isLocked}
                value={formik.values.curp}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="h-9 uppercase"
              />
            </FieldRow>
          ) : null}
          <FieldRow
            id="opa-phone"
            label={t("staffPortal.payoutAccounts.phone")}
            required
            error={showErr("phone")}
          >
            <Input
              id="opa-phone"
              name="phone"
              inputMode="numeric"
              disabled={isLocked}
              value={formik.values.phone}
              onChange={(e) =>
                void formik.setFieldValue(
                  "phone",
                  e.target.value.replace(/\D/g, "").slice(0, 10),
                )
              }
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-invoice"
            label={t("staffPortal.payoutAccounts.invoiceEmail")}
            required
            error={showErr("invoice_email")}
          >
            <Input
              id="opa-invoice"
              name="invoice_email"
              type="email"
              disabled={isLocked}
              value={formik.values.invoice_email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
        </div>
      </FieldGroup>

      <FieldGroup title={t("staffPortal.payoutAccounts.sectionFiscalAddress")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow
            id="opa-street"
            label={t("staffPortal.payoutAccounts.fiscalStreet")}
            required
            error={showErr("fiscal_street")}
            fullWidth
          >
            <Input
              id="opa-street"
              name="fiscal_street"
              disabled={isLocked}
              value={formik.values.fiscal_street}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-ext"
            label={t("staffPortal.payoutAccounts.fiscalExt")}
            required
            error={showErr("fiscal_ext_number")}
          >
            <Input
              id="opa-ext"
              name="fiscal_ext_number"
              disabled={isLocked}
              value={formik.values.fiscal_ext_number}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-int"
            label={t("staffPortal.payoutAccounts.fiscalInt")}
            error={showErr("fiscal_int_number")}
          >
            <Input
              id="opa-int"
              name="fiscal_int_number"
              disabled={isLocked}
              value={formik.values.fiscal_int_number}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-colonia"
            label={t("staffPortal.payoutAccounts.fiscalNeighborhood")}
            required
            error={showErr("fiscal_neighborhood")}
          >
            <Input
              id="opa-colonia"
              name="fiscal_neighborhood"
              disabled={isLocked}
              value={formik.values.fiscal_neighborhood}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-city"
            label={t("staffPortal.payoutAccounts.fiscalCity")}
            required
            error={showErr("fiscal_city")}
          >
            <Input
              id="opa-city"
              name="fiscal_city"
              disabled={isLocked}
              value={formik.values.fiscal_city}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-muni"
            label={t("staffPortal.payoutAccounts.fiscalMunicipality")}
            required
            error={showErr("fiscal_municipality")}
          >
            <Input
              id="opa-muni"
              name="fiscal_municipality"
              disabled={isLocked}
              value={formik.values.fiscal_municipality}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
          <FieldRow
            id="opa-state"
            label={t("staffPortal.payoutAccounts.fiscalState")}
            required
            error={showErr("fiscal_state")}
          >
            <Select
              disabled={isLocked}
              value={formik.values.fiscal_state || undefined}
              onValueChange={(v) => void formik.setFieldValue("fiscal_state", v)}
            >
              <SelectTrigger id="opa-state" className="h-9">
                <SelectValue
                  placeholder={t("staffPortal.payoutAccounts.fiscalStatePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {MX_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow
            id="opa-cp"
            label={t("staffPortal.payoutAccounts.fiscalPostalCode")}
            required
            error={showErr("fiscal_postal_code")}
          >
            <Input
              id="opa-cp"
              name="fiscal_postal_code"
              inputMode="numeric"
              disabled={isLocked}
              value={formik.values.fiscal_postal_code}
              onChange={(e) =>
                void formik.setFieldValue(
                  "fiscal_postal_code",
                  e.target.value.replace(/\D/g, "").slice(0, 5),
                )
              }
              onBlur={formik.handleBlur}
              className="h-9"
            />
          </FieldRow>
        </div>
      </FieldGroup>

      <FieldGroup title={t("staffPortal.payoutAccounts.sectionDocs")}>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow
            id="opa-constancia"
            label={t("staffPortal.payoutAccounts.constancia")}
            required
            error={showErr("constancia_url")}
            hint={
              formik.values.constancia_url
                ? t("staffPortal.payoutAccounts.docUploaded")
                : undefined
            }
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLocked || uploadingConstancia}
                className="gap-1.5"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/pdf,image/*";
                  input.onchange = () => {
                    const f = input.files?.[0];
                    if (f) void uploadDoc(f, "constancia");
                  };
                  input.click();
                }}
              >
                {uploadingConstancia ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {t("staffPortal.payoutAccounts.upload")}
              </Button>
            </div>
          </FieldRow>
          <FieldRow
            id="opa-statement"
            label={t("staffPortal.payoutAccounts.bankStatement")}
            required
            error={showErr("bank_statement_url")}
            hint={
              formik.values.bank_statement_url
                ? t("staffPortal.payoutAccounts.docUploaded")
                : undefined
            }
          >
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLocked || uploadingStatement}
                className="gap-1.5"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/pdf,image/*";
                  input.onchange = () => {
                    const f = input.files?.[0];
                    if (f) void uploadDoc(f, "statement");
                  };
                  input.click();
                }}
              >
                {uploadingStatement ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {t("staffPortal.payoutAccounts.upload")}
              </Button>
            </div>
          </FieldRow>
        </div>
      </FieldGroup>

      <ToggleRow
        label={t("staffPortal.payoutAccounts.isDefault")}
        description={t("staffPortal.payoutAccounts.isDefaultHint")}
        control={
          <Switch
            checked={formik.values.is_default}
            disabled={isLocked}
            onCheckedChange={(c) => void formik.setFieldValue("is_default", c)}
          />
        }
      />

      {!isLocked ? (
        <>
          <ConsentCheck
            id="opa-confirm"
            checked={formik.values.confirm_correct}
            onCheckedChange={(c) =>
              void formik.setFieldValue("confirm_correct", c)
            }
          >
            {t("staffPortal.payoutAccounts.confirmCorrect")}
          </ConsentCheck>
          {showErr("confirm_correct") ? (
            <p className="text-[11px] text-destructive">{showErr("confirm_correct")}</p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={formik.isSubmitting || !formik.values.confirm_correct}
              className="gap-2"
            >
              {formik.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {t("staffPortal.payoutAccounts.submitCta")}
            </Button>
          </div>
        </>
      ) : null}
    </SectionShell>
  );
}

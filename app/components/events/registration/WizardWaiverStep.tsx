import { useFormik } from "formik";
import * as Yup from "yup";
import { ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EventWaiverPublic, WaiverSignatureInput } from "@shared/api";
import { WAIVER_ACCEPTANCE_SIGNATURE } from "@shared/waiverConstants";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WizardWaiverStepProps {
  waivers: EventWaiverPublic[];
  onAccepted: (signatures: WaiverSignatureInput[]) => void;
  /** Staff editor: show athlete UX without completing registration. */
  preview?: boolean;
}

export default function WizardWaiverStep({
  waivers,
  onAccepted,
  preview = false,
}: WizardWaiverStepProps) {
  const { t } = useTranslation();
  const multiple = waivers.length > 1;

  const formik = useFormik({
    initialValues: {
      accepted: false,
    },
    validationSchema: Yup.object({
      accepted: Yup.boolean().oneOf(
        [true],
        multiple
          ? t("registrationWizard.waiver.mustAcceptAll")
          : t("registrationWizard.waiver.mustAccept"),
      ),
    }),
    onSubmit: () => {
      if (preview) return;
      onAccepted(
        waivers.map((w) => ({
          waiverId: w.id,
          signature: WAIVER_ACCEPTANCE_SIGNATURE,
          waiverVersion: w.version,
        })),
      );
    },
  });

  if (waivers.length === 0) {
    if (!preview) return null;
    return (
      <p className="text-sm text-muted-foreground min-w-0 break-words">
        {t("registrationWizard.waiver.previewEmpty")}
      </p>
    );
  }

  const acceptId = preview ? "waiver-accepted-preview" : "waiver-accepted";

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4 w-full min-w-0 max-w-full">
      {preview ? (
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 leading-snug">
          {t("registrationWizard.waiver.previewBanner")}
        </p>
      ) : null}
      <div className="flex items-center gap-2 text-primary min-w-0">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <h3 className="font-semibold text-sm min-w-0 break-words">
          {multiple
            ? t("registrationWizard.waiver.titleMultiple", { count: waivers.length })
            : waivers[0]?.title}
        </h3>
      </div>

      {multiple ? (
        <p className="text-xs text-muted-foreground">{t("registrationWizard.waiver.allRequiredHint")}</p>
      ) : null}

      <div className="space-y-4 max-h-[min(70vh,560px)] overflow-y-auto overflow-x-clip pr-1 min-w-0">
        {waivers.map((waiver, index) => (
          <div
            key={waiver.id}
            className="rounded-xl border border-border bg-black/20 p-4 space-y-3 min-w-0 max-w-full"
          >
            {multiple ? (
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("registrationWizard.waiver.itemLabel", { index: index + 1 })}
              </p>
            ) : null}
            {multiple ? (
              <h4 className="font-medium text-sm text-muted-foreground break-words">
                {waiver.title}
              </h4>
            ) : null}

            {(waiver.content_type === "html" || waiver.content_type === "both") &&
            waiver.content_html?.trim() ? (
              <div
                className="max-h-40 overflow-y-auto overflow-x-auto text-sm text-muted-foreground prose prose-invert prose-sm max-w-none min-w-0 [&_table]:block [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(waiver.content_html) }}
              />
            ) : null}

            {(waiver.content_type === "pdf" || waiver.content_type === "both") &&
            waiver.pdf_url ? (
              <div className="space-y-2 min-w-0 max-w-full">
                <iframe
                  title={t("registrationWizard.waiver.viewPdfEmbedded", {
                    title: waiver.title,
                  })}
                  src={waiver.pdf_url}
                  className="w-full min-h-[240px] h-[40vh] max-h-[420px] rounded-lg border border-border bg-background/40"
                />
                <a
                  href={waiver.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline min-w-0 break-words"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {t("registrationWizard.waiver.openPdfNewTab")}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {t("registrationWizard.waiver.version", { version: waiver.version })}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <Checkbox
            id={acceptId}
            checked={formik.values.accepted}
            onCheckedChange={(v) => formik.setFieldValue("accepted", v === true)}
          />
          <Label htmlFor={acceptId} className="text-sm leading-snug cursor-pointer min-w-0">
            {multiple
              ? t("registrationWizard.waiver.acceptAllLabel")
              : t("registrationWizard.waiver.acceptLabel")}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-7 leading-snug">
          {t("registrationWizard.waiver.platformDisclaimer")}
        </p>
      </div>
      {formik.touched.accepted && formik.errors.accepted ? (
        <p className="text-xs text-destructive">{formik.errors.accepted}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full h-11"
        disabled={formik.isSubmitting || (preview && !formik.values.accepted)}
      >
        {formik.isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {preview
          ? t("registrationWizard.waiver.previewContinue")
          : t("registrationWizard.waiver.continue")}
      </Button>
      {preview && formik.values.accepted ? (
        <p className="text-xs text-accent text-center leading-snug">
          {t("registrationWizard.waiver.previewSignedHint")}
        </p>
      ) : null}
    </form>
  );
}

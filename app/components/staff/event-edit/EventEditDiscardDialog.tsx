import { useTranslation } from "react-i18next";
import type { DiscardIntent } from "@/hooks/use-unsaved-changes-guard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface EventEditDiscardDialogProps {
  open: boolean;
  intent?: DiscardIntent;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EventEditDiscardDialog({
  open,
  intent = "leave",
  onConfirm,
  onCancel,
}: EventEditDiscardDialogProps) {
  const { t } = useTranslation();
  const isSwitchTab = intent === "switchTab";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(
              isSwitchTab
                ? "staffPortal.eventEdit.discardSwitchTitle"
                : "staffPortal.eventEdit.discardTitle",
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              isSwitchTab
                ? "staffPortal.eventEdit.discardSwitchBody"
                : "staffPortal.eventEdit.discardBody",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel onClick={onCancel}>
            {t("staffPortal.eventEdit.discardStay")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t(
              isSwitchTab
                ? "staffPortal.eventEdit.discardSwitchContinue"
                : "staffPortal.eventEdit.discardLeave",
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

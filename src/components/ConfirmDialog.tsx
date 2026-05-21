import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfirmDialog = ({
  open,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this? This cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="max-w-[320px] gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive text-base">
          <AlertTriangle size={18} />
          {title}
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-destructive text-destructive-foreground font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? "Deleting…" : confirmLabel}
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ConfirmDialog;

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiCollectDue } from "@/lib/api";
import { syncLiveBusinessData } from "@/lib/live-sync";
import { store } from "@/lib/store";
import { emitStoreUpdate, showSaved } from "@/hooks/use-live-data";

export interface PayDueParty {
  id: string;
  name: string;
  due: number;
  source: "customer" | "supplier";
}

interface PayDueDialogProps {
  party: PayDueParty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid?: (amount: number) => void;
}

function updateLocalDue(party: PayDueParty, amount: number): void {
  if (party.source === "customer") {
    store.saveCustomers(
      store.getCustomers().map((c) => (c.id === party.id ? { ...c, due: Math.max(0, c.due - amount) } : c))
    );
  } else {
    store.saveSuppliers(
      store.getSuppliers().map((s) => (s.id === party.id ? { ...s, due: Math.max(0, s.due - amount) } : s))
    );
  }
  emitStoreUpdate();
}

/** Shared "record a payment against a party's outstanding due" dialog — used
 * anywhere a customer/supplier due balance needs to be settled (Due List,
 * Customers list, Sales list) so the validation/API/optimistic-update logic
 * only lives in one place. */
const PayDueDialog = ({ party, open, onOpenChange, onPaid }: PayDueDialogProps) => {
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset the amount field whenever a different party is opened.
  useEffect(() => {
    if (open) setPaymentAmount("");
  }, [open, party?.id]);

  const handleRecordPayment = async () => {
    if (!party || !paymentAmount) {
      toast({ title: "Please enter payment amount", variant: "destructive" });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > party.due) {
      toast({
        title: "Invalid amount",
        description: `Please enter amount between 0 and ${formatCurrency(party.due)}`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiCollectDue({
        party_id: party.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        payDueAmount: amount,
        payments: [{ type: "cash", amount }],
      });

      updateLocalDue(party, amount);
      await syncLiveBusinessData().catch(() => null);
      onOpenChange(false);
      showSaved(`Payment of ${formatCurrency(amount)} recorded successfully`);
      onPaid?.(amount);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment recording failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        {party && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Party:</span>
                <span className="font-semibold">{party.name}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Total Debt:</span>
                <span className="font-semibold text-red-600">{formatCurrency(party.due)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payDueAmount" className="text-sm font-semibold">
                Payment Amount
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">₵</span>
                <Input
                  id="payDueAmount"
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min={0}
                  max={party.due}
                  step="0.01"
                  autoFocus
                />
              </div>
            </div>

            {paymentAmount && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm space-y-1">
                <p className="text-muted-foreground">After Payment:</p>
                <p className="font-semibold">
                  New Debt: {formatCurrency(Math.max(0, party.due - parseFloat(paymentAmount)))}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={!paymentAmount || isSaving} className="flex-1">
                {isSaving ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayDueDialog;

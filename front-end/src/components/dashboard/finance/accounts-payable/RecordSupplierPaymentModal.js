import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { fetchSubAccounts } from "@/redux/service/billing";
import { allocateSupplierPayment } from "@/redux/service/inventory";
import { formatMoney } from "@/functions/money";

// YYYY-MM-DD in the viewer's own timezone, not UTC's.
const today = () => new Date().toLocaleDateString("en-CA");

const inputClass = "border border-gray rounded px-2 py-2 text-sm focus:outline-none w-full";

// Paying goes through the same endpoint as Make Payments, so the invoice can only
// show as paid once a receipt exists and the money has left an account.
const RecordSupplierPaymentModal = ({ invoice, onClose, onPaid }) => {
  const auth = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const outstanding = Number(invoice?.outstanding_amount || 0);

  useEffect(() => {
    if (!invoice) return;
    setAccountId("");
    setAmount(invoice.outstanding_amount);
    setReference("");
    setDate(today());
    fetchSubAccounts(auth)
      .then((rows) =>
        setAccounts(rows.filter((row) => row.active !== false && Number(row.balance) > 0))
      )
      .catch(() => toast.error("Could not load the accounts"));
  }, [invoice?.id]);

  if (!invoice) return null;

  const account = accounts.find((row) => row.id === Number(accountId));

  const submit = async () => {
    const value = Number(amount);
    if (!account) return toast.error("Choose the account to pay from");
    if (!(value > 0)) return toast.error("Enter the amount paid");
    if (value > outstanding) return toast.error(`Only ${formatMoney(outstanding)} is owed on this invoice`);
    if (value > Number(account.balance)) {
      return toast.error(`${account.name} only has ${formatMoney(account.balance)}`);
    }
    if (!reference.trim()) return toast.error("Enter the payment reference");
    if (!date) return toast.error("Choose the payment date");

    setSaving(true);
    try {
      await allocateSupplierPayment(auth, {
        supplier_id: invoice.supplier,
        invoice_ids: [invoice.id],
        sub_account: account.id,
        amount: value,
        reference_number: reference.trim(),
        payment_date: date,
      });
      toast.success(value === outstanding ? "Invoice paid" : "Part payment recorded");
      onPaid();
    } catch (error) {
      toast.error(typeof error === "string" ? error : error?.detail || "Could not record the payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open onClose={onClose}>
      <DialogTitle className="w-full bg-gray font-bold items-center justify-center flex">
        Record Payment: {invoice.invoice_no}
      </DialogTitle>
      <DialogContent>
        <div className="mt-4 space-y-3 text-sm">
          <p>
            {invoice.supplier_name} is owed <strong>{formatMoney(outstanding)}</strong> on this invoice.
          </p>
          <label className="block">
            Pay from
            <select
              className={`${inputClass} mt-1`}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="" disabled>Select account</option>
              {accounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.main_account_name}): {formatMoney(row.balance)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Amount
            <input
              className={`${inputClass} mt-1 text-right`}
              type="number"
              min="0.01"
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block">
            Reference Number
            <input
              className={`${inputClass} mt-1`}
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label className="block">
            Payment Date
            <input
              className={`${inputClass} mt-1`}
              type="date"
              max={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="border border-gray rounded px-4 py-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="bg-primary text-white rounded px-4 py-2 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecordSupplierPaymentModal;

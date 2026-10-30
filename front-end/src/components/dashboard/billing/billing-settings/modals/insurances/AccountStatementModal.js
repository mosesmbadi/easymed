import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const thisMonth = () => new Date().toISOString().slice(0, 7);

// "2026-10" -> the first and last day of that month.
const monthBounds = (month) => {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
};

/**
 * What a credit account was billed in a month, what it paid and what it
 * owes -- the statement an employer or a referring facility settles against.
 */
const AccountStatementModal = ({ open, setOpen, account }) => {
  const auth = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const query = (extra = {}) =>
    new URLSearchParams({ id: account?.id, ...monthBounds(month), ...extra }).toString();

  useEffect(() => {
    if (!open || !account?.id || !month) return;
    setLoading(true);
    fetch(`/api/billing/account-statement?${query()}`, {
      headers: { Authorization: `Bearer ${auth?.token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : Promise.reject()))
      .then(setStatement)
      .catch(() => {
        setStatement(null);
        toast.error("Could not load the statement");
      })
      .finally(() => setLoading(false));
  }, [open, account?.id, month]);

  const downloadPdf = async () => {
    try {
      const resp = await fetch(`/api/billing/account-statement?${query({ download: "pdf" })}`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      if (!resp.ok) {
        toast.error("Could not download the statement");
        return;
      }
      const url = URL.createObjectURL(await resp.blob());
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error("Could not download the statement");
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <h2 className="font-bold text-xl mb-1">Statement of Account</h2>
        <p className="text-sm mb-4">
          {account?.name} &middot; {account?.account_type_display}
        </p>
        <label className="text-sm">
          Month
          <input
            type="month"
            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>

        {loading && <p className="text-sm my-4">Loading...</p>}
        {!loading && statement && (
          <table className="w-full text-sm my-4">
            <tbody>
              <tr>
                <td>Balance brought forward</td>
                <td className="text-right">{money(statement.opening_balance)}</td>
              </tr>
              <tr>
                <td>Charges ({statement.charges.length} lines)</td>
                <td className="text-right">{money(statement.total_charged)}</td>
              </tr>
              <tr>
                <td>Payments ({statement.payments.length})</td>
                <td className="text-right">({money(statement.total_paid)})</td>
              </tr>
              <tr className="font-semibold border-t">
                <td>Amount due</td>
                <td className="text-right">{money(statement.closing_balance)}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-gray rounded-xl px-4 py-2 text-sm"
          >
            Close
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!month}
            className="bg-primary text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            Download PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountStatementModal;

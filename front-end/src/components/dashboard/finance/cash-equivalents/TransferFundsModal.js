import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { makeAccountTransfer } from "@/redux/service/billing";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// YYYY-MM-DD in the viewer's own timezone, not UTC's.
const today = () => new Date().toLocaleDateString("en-CA");

const inputClass = "border border-gray rounded px-2 py-1 text-sm focus:outline-none w-full";

const TransferFundsModal = ({ account, accounts, onClose, onTransferred }) => {
  const auth = useAuth();
  const [amount, setAmount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmount("");
    setToAccount("");
    setDate(today());
  }, [account?.id]);

  if (!account) return null;

  const destinations = accounts.filter((row) => row.id !== account.id && row.active);

  const submit = async () => {
    const value = Number(amount);
    if (!(value > 0)) return toast.error("Enter the amount to transfer");
    if (value > account.balance) {
      return toast.error(`${account.sub_account} only has ${money(account.balance)}`);
    }
    if (!toAccount) return toast.error("Choose the account to transfer to");
    if (!date) return toast.error("Choose the date of the transfer");

    setSaving(true);
    try {
      await makeAccountTransfer(auth, {
        from_account: account.id,
        to_account: Number(toAccount),
        amount,
        transfer_date: date,
      });
      toast.success("Transfer made");
      onTransferred();
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Could not make the transfer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" open onClose={onClose}>
      <DialogTitle className="w-full bg-gray font-bold items-center justify-center flex">
        Transfer Funds
      </DialogTitle>
      <DialogContent>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-[#D3D3D3]">
                <th className="py-2 pr-3">Acc Name</th>
                <th className="py-2 pr-3 text-right">Bal</th>
                <th className="py-2 pr-3">Transfer Amnt</th>
                <th className="py-2 pr-3">To Accnt</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 pr-3">{account.sub_account}</td>
                <td className="py-2 pr-3 text-right">{money(account.balance)}</td>
                <td className="py-2 pr-3">
                  <input
                    aria-label="Amount to transfer"
                    className={`${inputClass} text-right`}
                    type="number"
                    min="0.01"
                    max={account.balance}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    aria-label="Account to transfer to"
                    className={inputClass}
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                  >
                    <option value="" disabled>Select account</option>
                    {destinations.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.sub_account} ({row.main_account})
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    aria-label="Date of the transfer"
                    className={inputClass}
                    type="date"
                    max={today()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submit}
                    className="bg-primary text-white rounded px-4 py-1.5 disabled:opacity-60"
                  >
                    {saving ? "Transferring..." : "Transfer"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferFundsModal;

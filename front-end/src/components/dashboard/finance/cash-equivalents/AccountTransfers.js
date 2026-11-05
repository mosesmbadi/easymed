import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { fetchAccountTransfers, reverseAccountTransfer } from "@/redux/service/billing";
import { isAdmin } from "@/utils/permissions";

const money = (value) =>
  `Ksh ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AccountTransfers = () => {
  const auth = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reversing, setReversing] = useState(null);

  const load = useCallback(() => {
    if (!auth) return;
    const params = {};
    if (startDate) params.transfer_date__gte = startDate;
    if (endDate) params.transfer_date__lte = endDate;

    setLoading(true);
    fetchAccountTransfers(auth, params)
      .then(setTransfers)
      .catch(() => toast.error("Could not load transfers"))
      .finally(() => setLoading(false));
  }, [auth, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const reverse = async (transfer) => {
    const question =
      `Send ${money(transfer.amount)} back from ${transfer.to_account_name} ` +
      `to ${transfer.from_account_name}? The original transfer stays on record.`;
    if (!window.confirm(question)) return;

    setReversing(transfer.id);
    try {
      await reverseAccountTransfer(auth, transfer.id);
      toast.success("Transfer reversed");
      load();
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Could not reverse the transfer");
    } finally {
      setReversing(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 items-center">
          <label htmlFor="transfers-from" className="text-sm font-semibold">From:</label>
          <input
            id="transfers-from"
            type="date"
            className="border p-2 rounded text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <label htmlFor="transfers-to" className="text-sm font-semibold">To:</label>
          <input
            id="transfers-to"
            type="date"
            className="border p-2 rounded text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(startDate || endDate) && (
          <button
            type="button"
            className="text-sm text-gray-500 underline"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear dates
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#1e293b] text-white text-left">
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">From</th>
              <th className="px-4 py-3 font-semibold">To</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold">Made By</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  {loading ? "Loading..." : "No transfers found."}
                </td>
              </tr>
            )}
            {transfers.map((transfer) => {
              const canReverse =
                isAdmin(auth) && !transfer.reversal_of && !transfer.reversed_by_reference;
              return (
                <tr key={transfer.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{transfer.reference}</td>
                  <td className="px-4 py-2">{transfer.transfer_date}</td>
                  <td className="px-4 py-2">{transfer.from_account_name}</td>
                  <td className="px-4 py-2">{transfer.to_account_name}</td>
                  <td className="px-4 py-2 text-right">{money(transfer.amount)}</td>
                  <td className="px-4 py-2">{transfer.created_by_name}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {transfer.reversal_of_reference && `Reversal of ${transfer.reversal_of_reference}`}
                    {transfer.reversed_by_reference && `Reversed by ${transfer.reversed_by_reference}`}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canReverse && (
                      <button
                        type="button"
                        disabled={reversing === transfer.id}
                        className="text-primary underline disabled:opacity-60"
                        onClick={() => reverse(transfer)}
                      >
                        {reversing === transfer.id ? "Reversing..." : "Reverse"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountTransfers;

import React, { useCallback, useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import {
  fetchCreditNotes,
  issueCreditNote,
  openCreditNotePdf,
  searchInvoices,
} from "@/redux/service/billing";
import { isAdmin } from "@/utils/permissions";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputClass = "border border-gray rounded px-2 py-1 text-sm focus:outline-none";

/** Picks what to credit on one invoice: every billed line that has value left. */
const NewCreditNote = ({ auth, onIssued }) => {
  const [selected, setSelected] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [saving, setSaving] = useState(false);

  const invoice = selected?.invoice;
  const lines = (invoice?.invoice_items ?? []).filter(
    (line) => line.status === "billed" && Number(line.net_amount) > 0
  );

  const loadInvoices = (input) =>
    input && input.trim().length >= 2
      ? searchInvoices(auth, input)
          .then((rows) =>
            rows.map((row) => ({
              value: row.id,
              label: `${row.invoice_number} · ${row.patient_full_name || row.patient_name || "No patient"}`,
              invoice: row,
            }))
          )
          .catch(() => [])
      : Promise.resolve([]);

  const toggleLine = (line) =>
    setAmounts((current) => {
      const next = { ...current };
      if (line.id in next) delete next[line.id];
      else next[line.id] = line.net_amount;
      return next;
    });

  const selectAll = () =>
    setAmounts(Object.fromEntries(lines.map((line) => [line.id, line.net_amount])));

  const total = Object.values(amounts).reduce((sum, value) => sum + (Number(value) || 0), 0);

  const submit = async () => {
    if (!reason.trim()) return toast.error("Say why the credit note is being issued");
    if (Object.keys(amounts).length === 0) return toast.error("Pick what to credit");
    setSaving(true);
    try {
      await issueCreditNote(auth, {
        invoice: invoice.id,
        reason,
        restock,
        lines: Object.entries(amounts).map(([id, amount]) => ({ invoice_item: Number(id), amount })),
      });
      toast.success("Credit note issued");
      setSelected(null);
      setAmounts({});
      setReason("");
      onIssued();
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Could not issue the credit note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded shadow p-4 mb-6 space-y-3 text-sm">
      <h2 className="font-semibold text-base">New Credit Note</h2>
      <AsyncSelect
        cacheOptions
        loadOptions={loadInvoices}
        value={selected}
        onChange={(option) => {
          setSelected(option);
          setAmounts({});
        }}
        isClearable
        placeholder="Search by invoice number or patient name..."
        noOptionsMessage={() => "Type at least 2 characters"}
      />

      {invoice && lines.length === 0 && <p>Nothing on this invoice has value left to credit.</p>}

      {lines.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-gray-500">Credit a whole line, or lower the amount to credit part of it.</p>
            <button type="button" onClick={selectAll} className="border border-gray rounded px-3 py-1">
              Whole invoice
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-[#D3D3D3]">
                <th className="py-1"></th>
                <th>Particulars</th>
                <th className="text-right">Billed</th>
                <th className="text-right">Left</th>
                <th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-[#EEE]">
                  <td className="py-1">
                    <input
                      type="checkbox"
                      aria-label={`Credit ${line.item_name}`}
                      checked={line.id in amounts}
                      onChange={() => toggleLine(line)}
                    />
                  </td>
                  <td>{line.item_name}</td>
                  <td className="text-right">{money(line.item_amount)}</td>
                  <td className="text-right">{money(line.net_amount)}</td>
                  <td className="text-right">
                    {line.id in amounts && (
                      <input
                        aria-label={`Amount to credit on ${line.item_name}`}
                        className={`${inputClass} w-24 text-right`}
                        type="number"
                        min="0.01"
                        max={line.net_amount}
                        step="0.01"
                        value={amounts[line.id]}
                        onChange={(e) =>
                          setAmounts((current) => ({ ...current, [line.id]: e.target.value }))
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className="block">
            Reason
            <input
              className={`${inputClass} block w-full mt-1 py-2`}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
            Put stock back on the shelf for lines credited in full
          </label>
          <div className="flex justify-between items-center">
            <p className="font-semibold">Total to credit: {money(total)}</p>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="bg-primary text-white rounded-xl px-6 py-2 disabled:opacity-60"
            >
              {saving ? "Issuing..." : "Issue Credit Note"}
            </button>
          </div>
        </>
      )}
    </section>
  );
};

const CreditNotes = () => {
  const auth = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!auth) return;
    setLoading(true);
    fetchCreditNotes(auth)
      .then(setNotes)
      .catch(() => toast.error("Could not load credit notes"))
      .finally(() => setLoading(false));
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {isAdmin(auth) && <NewCreditNote auth={auth} onIssued={load} />}

      <section className="bg-white rounded shadow p-4 text-sm overflow-x-auto">
        <h2 className="font-semibold text-base mb-2">Credit Notes</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-[#D3D3D3]">
              <th className="py-1">Number</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Reason</th>
              <th>Date</th>
              <th className="text-right">Credited</th>
              <th className="text-right">Refund Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-gray-500">
                  {loading ? "Loading..." : "No credit notes yet."}
                </td>
              </tr>
            )}
            {notes.map((note) => (
              <tr key={note.id} className="border-b border-[#EEE]">
                <td className="py-1">{note.credit_note_number}</td>
                <td>{note.invoice_number}</td>
                <td>{note.patient_name}</td>
                <td>{note.reason}</td>
                <td>{new Date(note.issued_at).toLocaleDateString()}</td>
                <td className="text-right">{money(note.total_amount)}</td>
                <td className="text-right">{money(note.refund_due)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() =>
                      openCreditNotePdf(auth, note.id).catch(() => toast.error("Could not open the PDF"))
                    }
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default CreditNotes;

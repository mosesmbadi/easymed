import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { fetchSupplierInvoiceDetails } from "@/redux/service/inventory";
import { formatMoney } from "@/functions/money";

const SupplierInvoiceDetailsModal = ({ invoice, onClose }) => {
  const auth = useAuth();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!invoice) return;
    setDetails(null);
    fetchSupplierInvoiceDetails(auth, invoice.id)
      .then(setDetails)
      .catch(() => toast.error("Could not load the invoice"));
  }, [invoice?.id]);

  if (!invoice) return null;

  const printReceipt = async (receiptId) => {
    try {
      const resp = await fetch(`/api/inventory/supplier-payment-receipts/${receiptId}/print`, {
        headers: { Authorization: `Bearer ${auth?.token}` },
      });
      if (!resp.ok) throw new Error("Failed");
      const url = URL.createObjectURL(await resp.blob());
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error("Could not open the receipt");
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" open onClose={onClose}>
      <DialogTitle className="w-full bg-gray font-bold items-center justify-center flex">
        Invoice {invoice.invoice_no}
      </DialogTitle>
      <DialogContent>
        {!details && <p className="py-6 text-center text-sm text-gray-500">Loading...</p>}
        {details && (
          <div className="mt-4 space-y-6 text-sm overflow-x-auto">
            <section>
              <h3 className="font-semibold mb-2">Items Received</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-[#D3D3D3]">
                    <th className="py-1">Item</th>
                    <th>Lot</th>
                    <th>Received In</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {details.lines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-gray-500">No items on this invoice.</td>
                    </tr>
                  )}
                  {details.lines.map((line) => (
                    <tr key={line.id} className="border-b border-[#EEE]">
                      <td className="py-1">{line.item_name}</td>
                      <td>{line.lot_no}</td>
                      <td>{line.department_name}</td>
                      <td className="text-right">{line.quantity} {line.item_unit_name}</td>
                      <td className="text-right">{formatMoney(line.purchase_price)}</td>
                      <td className="text-right">{formatMoney(line.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="font-semibold mb-2">Payments</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-[#D3D3D3]">
                    <th className="py-1">Date</th>
                    <th>Reference</th>
                    <th>Paid From</th>
                    <th className="text-right">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {details.payments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-500">No payments recorded yet.</td>
                    </tr>
                  )}
                  {details.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-[#EEE]">
                      <td className="py-1">{payment.payment_date}</td>
                      <td>{payment.reference_number}</td>
                      <td>{payment.sub_account_name}</td>
                      <td className="text-right">{formatMoney(payment.amount_applied)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="text-primary underline"
                          onClick={() => printReceipt(payment.receipt)}
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="flex justify-end gap-8 font-semibold pb-2">
              <span>Invoice: {formatMoney(details.invoice.amount)}</span>
              <span>Paid: {formatMoney(details.invoice.paid_amount)}</span>
              <span>Outstanding: {formatMoney(details.invoice.outstanding_amount)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupplierInvoiceDetailsModal;

import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";

const POLL_MS = 4000;
const GIVE_UP_MS = 2 * 60 * 1000;

/**
 * Prompt the patient's phone to pay an invoice by M-Pesa, then wait for
 * Safaricom to confirm. The payment is booked on the backend when it does;
 * this only shows how far it has got.
 */
const MpesaPromptModal = ({ open, setOpen, invoice, defaultPhone = "", onPaid }) => {
  const auth = useAuth();
  const [phone, setPhone] = useState(defaultPhone);
  const [push, setPush] = useState(null);
  const [sending, setSending] = useState(false);
  const started = useRef(0);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
      setPush(null);
    }
  }, [open, defaultPhone]);

  useEffect(() => {
    if (!push || push.status !== "pending") return undefined;
    const timer = setTimeout(async () => {
      if (Date.now() - started.current > GIVE_UP_MS) {
        setPush({ ...push, status: "timeout" });
        return;
      }
      try {
        const resp = await fetch(`/api/billing/mpesa-stk-push?id=${push.id}`, {
          headers: { Authorization: `Bearer ${auth?.token}` },
        });
        if (resp.ok) {
          const next = await resp.json();
          setPush(next);
          if (next.status === "paid") {
            toast.success(`M-Pesa payment received: ${next.mpesa_receipt_number}`);
            onPaid?.(next);
          }
        } else {
          setPush({ ...push });
        }
      } catch (e) {
        setPush({ ...push });
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [push]);

  const send = async () => {
    setSending(true);
    try {
      const resp = await fetch("/api/billing/mpesa-stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth?.token}` },
        body: JSON.stringify({ invoice_id: invoice.id, phone }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data?.detail || "Could not send the M-Pesa prompt");
        return;
      }
      started.current = Date.now();
      setPush(data);
    } catch (e) {
      toast.error("Could not send the M-Pesa prompt");
    } finally {
      setSending(false);
    }
  };

  const message = {
    pending: "Waiting for the patient to enter their M-Pesa PIN...",
    paid: `Paid. M-Pesa code ${push?.mpesa_receipt_number}. The invoice has been updated.`,
    cancelled: "The patient cancelled the prompt.",
    failed: push?.result_description || "The payment failed.",
    timeout: "No answer from Safaricom yet. Check the invoice shortly, or take the payment by hand.",
  }[push?.status];

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <h2 className="font-bold text-xl mb-1">M-Pesa prompt</h2>
        <p className="text-sm mb-4">
          Invoice {invoice?.invoice_number}. The patient&apos;s phone will ask for their PIN.
        </p>
        <label className="text-sm">
          Phone number
          <input
            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            disabled={push?.status === "pending"}
          />
        </label>
        {message && <p className="text-sm my-4">{message}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setOpen(false)} className="border border-gray rounded-xl px-4 py-2 text-sm">
            Close
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !phone || push?.status === "pending" || push?.status === "paid"}
            className="bg-primary text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            {sending ? "Sending..." : push && push.status !== "pending" ? "Send again" : "Send prompt"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaPromptModal;

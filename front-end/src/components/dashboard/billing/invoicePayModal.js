import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { allocatePayment, fetchSubAccounts } from "@/redux/service/billing";
import { getInsuranceInvoices, getPatientInvoices, getPaymentModes } from "@/redux/features/billing";
import { getAllPatients } from "@/redux/features/patients";
import ViewInvoiceItems from "./ViewInvoiceItemsModal";
import { getAllInsurance } from "@/redux/features/insurance";
import UnifiedPaymentForm from "./UnifiedPaymentForm";

const InvoicePayModal = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});
  const [open, setOpen] = useState(false);
  const [subAccounts, setSubAccounts] = useState([]);
  
  const dispatch = useDispatch();
  const auth = useAuth();
  
  const { patients } = useSelector((store) => store.patient);
  const { insurance } = useSelector((store) => store.insurance);
  const { invoices, paymodes } = useSelector((store) => store.billing);
  
  useEffect(() => {
    if (auth) {
      dispatch(getAllPatients(auth));
      dispatch(getPaymentModes(auth));
      dispatch(getAllInsurance(auth));
      fetchSubAccounts(auth)
        .then((res) => setSubAccounts(Array.isArray(res) ? res : res?.results || []))
        .catch((err) => console.error("Failed to fetch sub accounts", err));
    }
  }, [auth, dispatch]);

  // Fetch invoices when needed - this could be triggered by customer selection
  // For now, we'll handle it in the component or via a separate effect

  const handlePaymentSubmit = async (formData) => {
    // Build payload without null values
    const payload = {
      invoice_ids: formData.invoiceIds,
      amount: formData.payAmount,
      reference_number: formData.reference_number,
    };

    // Cash payments send sub_account; insurance payments send payment_mode
    if (formData.sub_account) {
      payload.sub_account = formData.sub_account;
    }
    if (formData.payment_mode) {
      payload.payment_mode = formData.payment_mode;
    }

    // Add payment_date only if provided
    if (formData.payment_date) {
      payload.payment_date = formData.payment_date;
    }

    // Add either patient_id or insurance_id based on category
    if (formData.paymentCategory === 'cash') {
      payload.patient_id = formData.customer.value;
    } else {
      payload.insurance_id = formData.customer.value;
    }

    try {
      setLoading(true);
      const receipt = await allocatePayment(auth, payload);
      toast.success('Payment allocated successfully');
      
      // Download receipt
      if (receipt?.id) {
        try {
          const resp = await fetch(`/api/billing/payment-receipt?id=${receipt.id}`, {
            headers: {
              'Authorization': `Bearer ${auth?.token}`,
            }
          });
          if (!resp.ok) {
            const txt = await resp.text();
            toast.error(txt || 'Failed to download receipt');
          } else {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
        } catch (e) {
          toast.error(e?.message || 'Error opening receipt');
        }
      }

      // Refresh invoices
      if (formData.paymentCategory === 'cash') {
        dispatch(getPatientInvoices(auth, formData.customer.value, 'pending'));
      } else {
        dispatch(getInsuranceInvoices(auth, formData.customer.value, 'pending'));
      }

      // Optionally reload the page or reset form state
      window.location.reload();
    } catch (err) {
      toast.error(err?.message || 'Payment allocation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoiceItems = (data) => {
    setSelectedRowData(data);
    setOpen(true);
  };

  // Effect to fetch invoices when customer changes
  useEffect(() => {
    // This will be handled by the UnifiedPaymentForm internally
    // or you can expose a customer state and fetch here
  }, []);

  
  return (
    <section className="p-6">
      <UnifiedPaymentForm
        patients={patients}
        insurance={insurance}
        invoices={invoices}
        paymodes={paymodes}
        subAccounts={subAccounts}
        onSubmit={handlePaymentSubmit}
        onViewInvoiceItems={handleViewInvoiceItems}
        loading={loading}
      />

      {open && <ViewInvoiceItems {...{ setOpen, open, selectedRowData }} />}
    </section>
  );
};

export default InvoicePayModal;
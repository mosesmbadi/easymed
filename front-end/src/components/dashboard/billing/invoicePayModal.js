import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { allocatePayment } from "@/redux/service/billing";
import { getPatientInvoices, getPaymentModes } from "@/redux/features/billing";
import { getAllPatients } from "@/redux/features/patients";
import ViewInvoiceItems from "./ViewInvoiceItemsModal";
import { getAllInsurance } from "@/redux/features/insurance";
import PaymentCategoryStep from "./PaymentCategoryStep";
import PaymentModeStep from "./PaymentModeStep";

const InvoicePayModal = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Category Step, 2 = Mode Step
  const [stepOneData, setStepOneData] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState({});
  const [open, setOpen] = useState(false);
  
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
    }
  }, [auth, dispatch]);

  // Fetch invoices when customer is selected in Step 1
  useEffect(() => {
    if (stepOneData?.customer) {
      if (stepOneData.paymentCategory === 'cash') {
        // Fetch patient invoices
        dispatch(getPatientInvoices(auth, stepOneData.customer.value));
      } else if (stepOneData.paymentCategory === 'credit') {
        // For insurance/credit: fetch patient invoices for now
        // Backend doesn't have a direct "invoices by insurance" endpoint yet
        // You may need to implement backend filtering or show all invoices
        // and filter client-side by insurance company in invoice items
        // For now, we'll fetch all invoices and filter in the component
        console.log('Insurance invoices - implement backend endpoint or filter client-side');
        // Placeholder: you could dispatch a getAllInvoices action here
      }
    }
  }, [stepOneData?.customer, stepOneData?.paymentCategory, auth, dispatch]);

  const handleStepOneUpdate = (data) => {
    setStepOneData(data);
    setStep(2);
  };

  const handleStepTwoConfirm = async (stepTwoData) => {
    // Build payload without null values
    const payload = {
      invoice_ids: stepOneData.invoiceIds,
      payment_mode: stepTwoData.payment_mode,
      amount: stepOneData.payAmount,
      reference_number: stepTwoData.reference_number,
    };

    // Add payment_date only if provided
    if (stepTwoData.payment_date) {
      payload.payment_date = stepTwoData.payment_date;
    }

    // Add either patient_id or insurance_id based on category
    if (stepOneData.paymentCategory === 'cash') {
      payload.patient_id = stepOneData.customer.value;
    } else {
      payload.insurance_id = stepOneData.customer.value;
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
      if (stepOneData.paymentCategory === 'cash') {
        dispatch(getPatientInvoices(auth, stepOneData.customer.value));
      }

      // Reset to step 1
      setStep(1);
      setStepOneData(null);
    } catch (err) {
      toast.error(err?.message || 'Payment allocation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStepTwoCancel = () => {
    setStep(1);
  };

  const handleViewInvoiceItems = (data) => {
    setSelectedRowData(data);
    setOpen(true);
  };

  
  return (
    <section className="p-6">
      {step === 1 && (
        <PaymentCategoryStep
          patients={patients}
          insurance={insurance}
          invoices={invoices}
          onUpdate={handleStepOneUpdate}
          onViewInvoiceItems={handleViewInvoiceItems}
        />
      )}

      {step === 2 && stepOneData && (
        <PaymentModeStep
          stepOneData={stepOneData}
          paymodes={paymodes}
          onConfirm={handleStepTwoConfirm}
          onCancel={handleStepTwoCancel}
          loading={loading}
        />
      )}

      {open && <ViewInvoiceItems {...{ setOpen, open, selectedRowData }} />}
    </section>
  );
};

export default InvoicePayModal;
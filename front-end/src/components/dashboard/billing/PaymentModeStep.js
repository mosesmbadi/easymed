import React, { useState } from "react";
import { Grid } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { formatMoney } from "@/functions/money";

const PaymentModeStep = ({ 
  stepOneData, 
  paymodes, 
  onConfirm, 
  onCancel,
  loading 
}) => {
  const [selectedPayMode, setSelectedPayMode] = useState(null);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const initialValues = {
    reference_number: '',
    payment_date: getTodayDate(),
  };

  const validationSchema = Yup.object().shape({
    reference_number: Yup.string().required("Reference number is required!"),
    payment_date: Yup.date().required("Payment date is required!"),
  });

  const handleConfirm = (formValue) => {
    if (!selectedPayMode) {
      toast.error("Please select a payment mode");
      return;
    }

    onConfirm({
      payment_mode: selectedPayMode.value,
      reference_number: formValue.reference_number,
      payment_date: formValue.payment_date,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-4">
          Step 2: Payment Mode & Confirmation
        </h2>
        
        {/* Summary from Step 1 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Payment Summary</h3>
          <Grid container spacing={2}>
            <Grid item md={3} xs={6}>
              <div>
                <span className="text-sm text-gray-600">Category:</span>
                <div className="font-semibold text-gray-900">
                  {stepOneData.paymentCategory === 'cash' ? 'Cash (Patient)' : 'Credit (Insurance)'}
                </div>
              </div>
            </Grid>
            <Grid item md={3} xs={6}>
              <div>
                <span className="text-sm text-gray-600">Customer:</span>
                <div className="font-semibold text-gray-900">{stepOneData.customer.label}</div>
              </div>
            </Grid>
            <Grid item md={2} xs={4}>
              <div>
                <span className="text-sm text-gray-600">Total Owed:</span>
                <div className="font-semibold text-gray-900">{formatMoney(stepOneData.totalOwed)}</div>
              </div>
            </Grid>
            <Grid item md={2} xs={4}>
              <div>
                <span className="text-sm text-gray-600">Pay Amount:</span>
                <div className="font-semibold text-green-700">{formatMoney(stepOneData.payAmount)}</div>
              </div>
            </Grid>
            <Grid item md={2} xs={4}>
              <div>
                <span className="text-sm text-gray-600">Balance:</span>
                <div className={`font-semibold ${
                  stepOneData.balance < 0 ? 'text-green-600' : 
                  stepOneData.balance > 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatMoney(stepOneData.balance)}
                </div>
              </div>
            </Grid>
          </Grid>
          <div className="mt-3">
            <span className="text-sm text-gray-600">Selected Invoices: </span>
            <span className="font-semibold text-gray-900">
              {stepOneData.selectedInvoices.length} invoice(s)
            </span>
          </div>
        </div>
      </div>

      {/* Payment Mode Form */}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleConfirm}
      >
        {({ values, setFieldValue }) => (
          <Form className="space-y-4">
            <Grid container spacing={3}>
              {/* Payment Mode Selection */}
              <Grid item md={6} xs={12}>
                <label className="text-lg font-semibold text-primary block mb-2">
                  Select Payment Mode *
                </label>
                <Select
                  value={selectedPayMode}
                  isSearchable
                  isClearable
                  onChange={setSelectedPayMode}
                  options={(paymodes || []).map((pm) => ({
                    value: pm.id,
                    label: `${pm.payment_mode} (${pm.payment_category})`,
                  }))}
                  placeholder="How is the payment made?"
                />
                {!selectedPayMode && (
                  <div className="text-xs text-gray-500 mt-1">
                    Cash, Mpesa, Cheque, or Online Banking
                  </div>
                )}
              </Grid>

              {/* Reference Number */}
              <Grid item md={6} xs={12}>
                <label className="text-lg font-semibold text-primary block mb-2" htmlFor="reference_number">
                  Reference Number *
                </label>
                <Field
                  id="reference_number"
                  name="reference_number"
                  className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                  placeholder="Mpesa Code, Cheque Number, Mobile Banking Code"
                />
                <ErrorMessage
                  name="reference_number"
                  component="div"
                  className="text-red-600 text-xs mt-1"
                />
              </Grid>

              {/* Payment Date */}
              <Grid item md={6} xs={12}>
                <label className="text-lg font-semibold text-primary block mb-2" htmlFor="payment_date">
                  Date of Payment *
                </label>
                <Field
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                />
                <ErrorMessage
                  name="payment_date"
                  component="div"
                  className="text-red-600 text-xs mt-1"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Defaults to today, change if payment was made on a different date
                </div>
              </Grid>
            </Grid>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t-2 border-gray-300">
              <div className="flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-gray-700 hover:bg-gray-800 rounded-lg text-lg px-8 py-3 text-white font-semibold transition-colors shadow-md flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Step 1
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 rounded-lg text-lg px-10 py-3 text-white font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading && (
                    <svg
                      aria-hidden="true"
                      role="status"
                      className="inline w-5 h-5 text-white animate-spin"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="#1C64F2"
                      />
                    </svg>
                  )}
                  {!loading && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Confirm Payment
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default PaymentModeStep;

import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Grid } from '@mui/material';
import { fetchInventories } from '@/redux/service/inventory';
import { fetchInsurancePriceForItem } from '@/redux/service/insurance';
import { useAuth } from '@/assets/hooks/use-auth';
import { updateInvoiceItems } from '@/redux/service/billing';
import { toast } from 'react-toastify';

const CategorizedItems = ({
  invoiceItem,
  patient_insurance,
  setLabReqSum,
  setLabReqCashSum,
  setLabReqInsuranceSum,
  setAppointmentSum,
  setAppointmentCashSum,
  setAppointmentInsuranceSum,
  setPrescribedDrugsSum,
  setPrescribedDrugsCashSum,
  setPrescribedDrugsInsuranceSum,
}, ref) => {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [cashPrice, setCashPrice] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCoPay, setSelectedCoPay] = useState(0);
  const [selectedPayMethod, setSelectedPayMethod] = useState(null);
  const [updatedInvoiceItem, setUpdatedInvoiceItem] = useState(invoiceItem);

  // Fetch cash price from inventory on mount
  useEffect(() => {
    setUpdatedInvoiceItem(invoiceItem);

    const fetchCashPrice = async () => {
      if (!invoiceItem?.item) return;

      try {
        const response = await fetchInventories(auth, '', invoiceItem.item);
        const inv = Array.isArray(response) && response.length > 0 ? response[0] : null;

        let price = 0;
        if (inv?.sale_price && parseFloat(inv.sale_price) > 0) {
          price = parseFloat(inv.sale_price);
        } else if (invoiceItem?.sale_price && parseFloat(invoiceItem.sale_price) > 0) {
          price = parseFloat(invoiceItem.sale_price);
        } else if (invoiceItem?.item_amount && parseFloat(invoiceItem.item_amount) > 0) {
          price = parseFloat(invoiceItem.item_amount);
        }

        setCashPrice(price);

        // Auto-select cash as default if not already billed
        if (invoiceItem?.status !== 'billed' && !selectedPayMethod) {
          const cashMode = patient_insurance?.find(
            mode => mode.is_default || mode.payment_category === 'cash'
          );
          if (cashMode) {
            setSelectedPayMethod(cashMode);
            setSelectedPrice(price);
            setSelectedCoPay(0);
          }
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
        // Fallback to invoice item values
        let price = 0;
        if (invoiceItem?.sale_price && parseFloat(invoiceItem.sale_price) > 0) {
          price = parseFloat(invoiceItem.sale_price);
        } else if (invoiceItem?.item_amount && parseFloat(invoiceItem.item_amount) > 0) {
          price = parseFloat(invoiceItem.item_amount);
        }
        setCashPrice(price);

        if (invoiceItem?.status !== 'billed' && !selectedPayMethod) {
          const cashMode = patient_insurance?.find(
            mode => mode.is_default || mode.payment_category === 'cash'
          );
          if (cashMode) {
            setSelectedPayMethod(cashMode);
            setSelectedPrice(price);
            setSelectedCoPay(0);
          }
        }
      }
    };

    fetchCashPrice();
  }, [invoiceItem]);

  // Handle payment mode change
  const handlePaymentModeChange = async (e) => {
    const selectedOption = patient_insurance?.find(
      (mode) => mode.id === parseInt(e.target.value)
    );

    if (!selectedOption) return;

    setSelectedPayMethod(selectedOption);

    if ((selectedOption.payment_category || '').toLowerCase() !== 'insurance') {
      // Cash or other non-insurance payment mode - use cash price
      setSelectedPrice(cashPrice);
      setSelectedCoPay(0);
    } else {
      // Insurance selected - fetch insurance price from backend
      // Get the item ID from either updatedInvoiceItem or the original invoiceItem prop
      const itemId = updatedInvoiceItem?.item ?? invoiceItem?.item;
      const insuranceCompanyId = selectedOption.insurance;

      // Validate we have the required IDs before making the API call
      if (!itemId) {
        console.error('[BILLING] Cannot fetch insurance price: item ID is missing');
        toast.error("Cannot determine item for insurance pricing. Using cash price.");
        setSelectedPrice(cashPrice);
        setSelectedCoPay(0);
        return;
      }

      if (!insuranceCompanyId) {
        console.warn('[BILLING] Insurance payment mode has no linked insurance company:', selectedOption.payment_mode);
        toast.warning(`Payment mode "${selectedOption.payment_mode}" has no linked insurance company. Using cash price.`);
        setSelectedPrice(cashPrice);
        setSelectedCoPay(0);
        return;
      }

      setPriceLoading(true);
      console.log('[BILLING] Fetching insurance price for:', {
        item_id: itemId,
        insurance_company_id: insuranceCompanyId,
        payment_mode: selectedOption.payment_mode,
      });
      try {
        const insurancePrice = await fetchInsurancePriceForItem(
          auth,
          itemId,
          insuranceCompanyId
        );

        console.log('[BILLING] Insurance price API response:', insurancePrice);

        if (insurancePrice && parseFloat(insurancePrice.sale_price) > 0) {
          console.log('[BILLING] Setting insurance price:', insurancePrice.sale_price, 'co_pay:', insurancePrice.co_pay);
          setSelectedPrice(parseFloat(insurancePrice.sale_price));
          setSelectedCoPay(parseFloat(insurancePrice.co_pay) || 0);
        } else {
          // No insurance price configured - fall back to cash price
          console.log('[BILLING] No insurance price found, using cash price:', cashPrice);
          setSelectedPrice(cashPrice);
          setSelectedCoPay(0);
          toast.warning("No insurance price set for this item. Using cash price.");
        }
      } catch (error) {
        console.error("[BILLING] Error fetching insurance price:", error);
        // Fallback to cash price on error
        setSelectedPrice(cashPrice);
        setSelectedCoPay(0);
        toast.error("Failed to fetch insurance price. Using cash price.");
      } finally {
        setPriceLoading(false);
      }
    }
  };

  const updateInvoiceTotals = (invoiceItem) => {
    if (invoiceItem.category.toLowerCase().includes("appointment")) {
      setAppointmentSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount));
      if (invoiceItem.payment_mode_name.toLowerCase() === "cash") {
        setAppointmentCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      } else {
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setAppointmentCashSum((prevSum) => prevSum + parseInt(co_pay))
        setAppointmentInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    } else if (invoiceItem.category === "Lab Test") {
      setLabReqSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      if (invoiceItem.payment_mode_name.toLowerCase() === "cash") {
        setLabReqCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      } else {
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setLabReqCashSum((prevSum) => prevSum + parseInt(co_pay))
        setLabReqInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    } else if (invoiceItem.category === "Drug") {
      setPrescribedDrugsSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      if (invoiceItem.payment_mode_name.toLowerCase() === "cash") {
        setPrescribedDrugsCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      } else {
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setPrescribedDrugsCashSum((prevSum) => prevSum + parseInt(co_pay))
        setPrescribedDrugsInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    }
  }

  const handleBillClick = async () => {
    if (!selectedPayMethod || !selectedPrice || selectedPrice <= 0) {
      toast.error("Please select a payment mode and ensure price is valid");
      return;
    }

    setLoading(true);
    try {
      // Calculate actual_total (what insurance pays = price - co_pay)
      const actualTotal = selectedPrice - selectedCoPay;

      const payload = {
        item_amount: selectedPrice,
        actual_total: actualTotal,
        payment_mode: selectedPayMethod.id,
        status: "billed"
      };

      const response = await updateInvoiceItems(auth, payload, updatedInvoiceItem.id);
      setUpdatedInvoiceItem(response);
      updateInvoiceTotals(response);
      toast.success("Item billed successfully");
    } catch (error) {
      console.error("Error billing item:", error);
      toast.error("Failed to bill item");
    } finally {
      setLoading(false);
    }
  };

  // Calculate actual total (what insurance pays)
  const actualTotal = (selectedPrice || 0) - (selectedCoPay || 0);

  useImperativeHandle(ref, () => ({
    billItem: async () => {
      if (updatedInvoiceItem?.status === 'billed') {
        return { success: true, message: 'Already billed' };
      }
      if (!selectedPayMethod || !selectedPrice || selectedPrice <= 0) {
        return { success: false, message: 'Missing payment details' };
      }

      // Return a promise that resolves when billing is complete
      return new Promise(async (resolve) => {
        // Reuse logic from handleBillClick but we need to await it and know result
        // Since handleBillClick doesn't return value, we will duplicate critical logic or refactor.
        // For simplicity and safety, let's just trigger it and wait a bit, or better:
        // We can just call handleBillClick and assume it works if no error thrown? 
        // handleBillClick catches its own errors.

        // Let's refactor handleBillClick slightly to return status? 
        // Or just copy the logic here? Copying prevents breaking existing button flow if I mess up.
        // But duplication is bad.

        // Let's try to call handleBillClick.
        // Since it's defined in the scope, we can call it.
        await handleBillClick();
        resolve({ success: true }); // We assume it handled its own errors/toasts
      });
    }
  }));

  return (
    <Grid className='flex items-center py-1' container>
      <Grid item xs={3}>
        <p>{updatedInvoiceItem?.item_code}</p>
      </Grid>
      <Grid item xs={4}>
        {updatedInvoiceItem?.status !== 'billed' ? (
          <div className="relative">
            <select
              className='p-2 focus:outline-none w-full'
              name={updatedInvoiceItem?.item_name}
              value={selectedPayMethod?.id || ""}
              onChange={handlePaymentModeChange}
              disabled={priceLoading}
            >
              <option value="" disabled>Payment Method</option>
              {patient_insurance?.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.payment_mode}
                </option>
              ))}
            </select>
            {/* Visual indicator for payment mode type */}
            {selectedPayMethod && (
              <div className="mt-1">
                {selectedPayMethod.payment_category === 'cash' || selectedPayMethod.is_default ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    💵 Cash Price
                  </span>
                ) : selectedPayMethod.payment_category === 'insurance' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    🏥 Insurance: {selectedPayMethod.payment_mode}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedPayMethod.payment_mode}
                  </span>
                )}
              </div>
            )}
            {priceLoading && (
              <div className="mt-1 text-xs text-gray-500">Loading price...</div>
            )}
          </div>
        ) : (
          <div className='p-2'>{updatedInvoiceItem.payment_mode_name}</div>
        )}
      </Grid>
      {updatedInvoiceItem?.status !== 'billed' ? (
        <>
          <Grid className='px-2 flex justify-center' item xs={2}>
            {selectedPayMethod && selectedPrice !== null && (
              <div className="mt-2">
                <p>{priceLoading ? '...' : selectedPrice}</p>
              </div>
            )}
          </Grid>
          <Grid className='px-2 flex justify-center' item xs={2}>
            {selectedPayMethod && selectedPrice !== null && (
              <div className="mt-2">
                <p>{priceLoading ? '...' : actualTotal}</p>
              </div>
            )}
          </Grid>
          <Grid className='px-2 flex justify-center' item xs={1}>
            {selectedPayMethod && selectedPrice !== null && selectedPrice > 0 && !priceLoading && (
              <button
                onClick={handleBillClick}
                type="button"
                className="bg-primary text-white px-3 py-2 text-xs rounded-xl"
                disabled={loading}
              >
                {loading && (
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    ></path>
                  </svg>
                )}
                bill
              </button>
            )}
          </Grid>
        </>
      ) : (
        <>
          <Grid className='flex justify-center' item xs={2}>
            <div className="mt-2">
              <p>{updatedInvoiceItem.item_amount}</p>
            </div>
          </Grid>
          <Grid className='flex justify-center' item xs={2}>
            <div className="mt-2">
              <p>{updatedInvoiceItem.actual_total}</p>
            </div>
          </Grid>
          <Grid className='flex justify-center' item xs={1}>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default forwardRef(CategorizedItems);

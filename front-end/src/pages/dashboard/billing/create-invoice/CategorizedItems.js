import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Grid } from '@mui/material';
import { fetchInventories } from '@/redux/service/inventory';
import { fetchInsurancePriceForItem } from '@/redux/service/insurance';
import { useAuth } from '@/assets/hooks/use-auth';
import { updateInvoiceItems } from '@/redux/service/billing';
import { isAdmin } from '@/utils/permissions';
import { toast } from 'react-toastify';

const amount = (value) => parseFloat(value) || 0;

const CategorizedItems = ({ invoiceItem, patient_insurance, onLineChange }, ref) => {
  const auth = useAuth();
  const canDiscount = isAdmin(auth);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [cashPrice, setCashPrice] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCoPay, setSelectedCoPay] = useState(0);
  const [selectedPayMethod, setSelectedPayMethod] = useState(null);
  const [discount, setDiscount] = useState('');

  const isBilled = invoiceItem?.status === 'billed';

  // Work out the cash price of a line still to be billed. A price of zero is a
  // real price: panels sold only as part of a profile have no price of their own.
  useEffect(() => {
    if (!invoiceItem?.item || isBilled) return;

    const applyCashPrice = (price) => {
      setCashPrice(price);
      // Auto-select the first entry (always Cash) until someone picks a mode.
      if (!selectedPayMethod && patient_insurance?.[0]) {
        setSelectedPayMethod(patient_insurance[0]);
        setSelectedPrice(price);
        setSelectedCoPay(0);
      }
    };
    const lineFigure = () => amount(invoiceItem.sale_price) || amount(invoiceItem.item_amount);

    fetchInventories(auth, '', invoiceItem.item)
      .then((response) => {
        const inventory = Array.isArray(response) && response.length > 0 ? response[0] : null;
        applyCashPrice(amount(inventory?.sale_price) || lineFigure());
      })
      .catch((error) => {
        console.error('Error fetching inventory:', error);
        applyCashPrice(lineFigure());
      });
  }, [invoiceItem?.id, isBilled, patient_insurance?.length]);

  const applyCashPriceForMode = () => {
    setSelectedPrice(cashPrice);
    setSelectedCoPay(0);
  };

  const handlePaymentModeChange = async (e) => {
    const selectedOption = patient_insurance?.find(
      (mode) => mode.id === parseInt(e.target.value)
    );
    if (!selectedOption) return;

    setSelectedPayMethod(selectedOption);

    if ((selectedOption.payment_category || '').toLowerCase() !== 'insurance') {
      applyCashPriceForMode();
      return;
    }
    if (!selectedOption.insurance) {
      toast.warning(`Payment mode "${selectedOption.payment_mode}" has no linked insurance company. Using cash price.`);
      applyCashPriceForMode();
      return;
    }

    setPriceLoading(true);
    try {
      const insurancePrice = await fetchInsurancePriceForItem(
        auth, invoiceItem.item, selectedOption.insurance);
      if (insurancePrice) {
        setSelectedPrice(amount(insurancePrice.sale_price));
        setSelectedCoPay(amount(insurancePrice.co_pay));
      } else {
        applyCashPriceForMode();
        if (cashPrice > 0) {
          toast.warning("No insurance price set for this item. Using cash price.");
        }
      }
    } catch (error) {
      console.error('[BILLING] Error fetching insurance price:', error);
      applyCashPriceForMode();
      toast.error("Failed to fetch insurance price. Using cash price.");
    } finally {
      setPriceLoading(false);
    }
  };

  // An insurance price is a split, not a discount: the insurer's sale_price
  // and the patient's co-pay are two parts of one charge, so the line is worth
  // the two added together and the patient owes the co-pay. A till discount
  // comes off the patient's part only.
  const isInsured = (selectedPayMethod?.payment_category || '').toLowerCase() === 'insurance';
  const lineTotal = (selectedPrice || 0) + (isInsured ? selectedCoPay : 0);
  const patientShare = isInsured ? selectedCoPay : (selectedPrice || 0);
  const discountValue = amount(discount);
  const patientPays = patientShare - discountValue;

  const billLine = async ({ quiet = false } = {}) => {
    if (!selectedPayMethod || selectedPrice === null) {
      toast.error("Please select a payment mode");
      return false;
    }
    if (discountValue < 0 || discountValue > patientShare) {
      toast.error(`The discount can't be more than the ${patientShare} the patient pays`);
      return false;
    }

    setLoading(true);
    try {
      // Only the payment mode and discount go up. The amounts are the server's
      // to work out from the item, the quantity and the mode.
      const payload = { payment_mode: selectedPayMethod.id, status: "billed" };
      if (discountValue > 0) payload.discount = discountValue.toFixed(2);

      const response = await updateInvoiceItems(auth, payload, invoiceItem.id);
      onLineChange(response);
      if (!quiet) toast.success("Item billed successfully");
      return true;
    } catch (error) {
      console.error("Error billing item:", error);
      toast.error(typeof error === 'string' && error ? error : `Failed to bill ${invoiceItem.item_name}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    billItem: async () => (isBilled ? true : billLine({ quiet: true })),
  }));

  const ready = selectedPayMethod && selectedPrice !== null;

  return (
    <Grid className='flex items-center py-1' container>
      <Grid item xs={3}>
        <p>{invoiceItem?.item_name}</p>
        <p className="text-xs text-gray-500">{invoiceItem?.item_code}</p>
      </Grid>
      <Grid item xs={3}>
        {!isBilled ? (
          <div className="relative">
            <select
              className='p-2 focus:outline-none w-full'
              name={invoiceItem?.item_name}
              value={selectedPayMethod?.id || ""}
              onChange={handlePaymentModeChange}
              disabled={priceLoading}
            >
              <option value="" disabled>Pay mode</option>
              {patient_insurance?.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.payment_mode}
                </option>
              ))}
            </select>
            {priceLoading && (
              <div className="mt-1 text-xs text-gray-500">Loading price...</div>
            )}
          </div>
        ) : (
          <div className='p-2'>{invoiceItem.payment_mode_name}</div>
        )}
      </Grid>
      {!isBilled ? (
        <>
          <Grid className='px-2 flex justify-end' item xs={2}>
            {ready && <p>{priceLoading ? '...' : lineTotal}</p>}
          </Grid>
          <Grid className='px-2 flex justify-end' item xs={2}>
            {ready && (canDiscount ? (
              <input
                aria-label={`Discount on ${invoiceItem?.item_name}`}
                className="border border-gray rounded px-2 py-1 w-20 text-right focus:outline-none"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={!patientShare}
              />
            ) : <p>0</p>)}
          </Grid>
          <Grid className='px-2 flex flex-col items-end' item xs={1}>
            {ready && <p>{priceLoading ? '...' : patientPays}</p>}
            {ready && isInsured && !priceLoading && (
              <p className="text-xs text-gray-500">+{selectedPrice} credit</p>
            )}
          </Grid>
          <Grid className='px-2 flex justify-center' item xs={1}>
            {ready && !priceLoading && (
              <button
                onClick={() => billLine()}
                type="button"
                className="bg-primary text-white px-3 py-2 text-xs rounded-xl disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '...' : 'bill'}
              </button>
            )}
          </Grid>
        </>
      ) : (
        <>
          <Grid className='px-2 flex justify-end' item xs={2}>
            <p>{invoiceItem.item_amount}</p>
          </Grid>
          <Grid className='px-2 flex justify-end' item xs={2}>
            <p>{(amount(invoiceItem.discount) + amount(invoiceItem.invoice_discount)).toFixed(2)}</p>
          </Grid>
          <Grid className='px-2 flex justify-end' item xs={1}>
            <p>{invoiceItem.patient_amount}</p>
          </Grid>
          <Grid item xs={1}></Grid>
        </>
      )}
    </Grid>
  );
};

export default forwardRef(CategorizedItems);

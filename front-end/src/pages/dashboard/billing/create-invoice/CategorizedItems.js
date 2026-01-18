import React, { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import * as Yup from "yup";
import { fetchInventories } from '@/redux/service/inventory';
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
 }) => {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [inventoryPrices, setInventoryPrices] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedCoPay, setSelectedCoPay] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState(null);
  const [updatedInvoiceItem, setUpdatedInvoiceItem] = useState(invoiceItem);

  const patient_insurance_for_this_item = patient_insurance?.filter((mode) =>
    mode.insurance === null || inventoryPrices[0]?.insurance_sale_prices?.some(insurance => insurance.insurance === mode.insurance)
  );

  const fetchInventoryForPrices = async (item) => {
    try {
      const response = await fetchInventories(auth, '', item);
      setInventoryPrices(response);
    } catch (error) {
      console.log("ERROR FETCHING INVENTORY PRICES", error);
    }
  };

  useEffect(() => {
    setUpdatedInvoiceItem(invoiceItem)
    // Use the latest prop directly to avoid stale state when fetching prices
    fetchInventoryForPrices(invoiceItem?.item);
  }, [invoiceItem]);

  // Auto-select default payment mode (cash) when inventory and payment modes are loaded
  useEffect(() => {
    if (!selectedPayMethod && patient_insurance_for_this_item?.length > 0 && inventoryPrices?.length > 0) {
      // Find default payment mode (cash or marked as default)
      const defaultMode = patient_insurance_for_this_item.find(
        mode => mode.is_default || mode.payment_category === 'cash'
      );
      
      if (defaultMode && updatedInvoiceItem?.status !== 'billed') {
        setSelectedPayMethod(defaultMode);
        
        // Auto-populate with cash price from inventory
        const inv0 = inventoryPrices[0];
        // Prefer inventory sale_price, then fall back to existing invoice item values
        let price = 0;
        
        if (inv0?.sale_price && inv0.sale_price > 0) {
          price = inv0.sale_price;
        } else if (updatedInvoiceItem?.sale_price && updatedInvoiceItem.sale_price > 0) {
          price = updatedInvoiceItem.sale_price;
        } else if (updatedInvoiceItem?.item_amount && updatedInvoiceItem.item_amount > 0) {
          price = updatedInvoiceItem.item_amount;
        }
        
        setSelectedPrice(price);
        setSelectedCoPay(0);
      }
    }
  }, [patient_insurance_for_this_item, inventoryPrices, selectedPayMethod, updatedInvoiceItem]);

  const updateInvoiceTotals = (invoiceItem) => {
    if(invoiceItem.category.toLowerCase().includes("appointment")){
      setAppointmentSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount));
      if(invoiceItem.payment_mode_name.toLowerCase() === "cash"){
        setAppointmentCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      }else{
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setAppointmentCashSum((prevSum) => prevSum + parseInt(co_pay))
        setAppointmentInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    }else if(invoiceItem.category==="Lab Test"){
      setLabReqSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      if(invoiceItem.payment_mode_name.toLowerCase() === "cash"){
        setLabReqCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      }else{
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setLabReqCashSum((prevSum) => prevSum + parseInt(co_pay))
        setLabReqInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    }else if(invoiceItem.category==="Drug"){
      setPrescribedDrugsSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      if(invoiceItem.payment_mode_name.toLowerCase() === "cash"){
        setPrescribedDrugsCashSum((prevSum) => prevSum + parseInt(invoiceItem.item_amount))
      }else{
        const co_pay = parseInt(invoiceItem.item_amount) - parseInt(invoiceItem.actual_total)
        setPrescribedDrugsCashSum((prevSum) => prevSum + parseInt(co_pay))
        setPrescribedDrugsInsuranceSum((prevSum) => prevSum + parseInt(invoiceItem.actual_total))
      }
    }
  }

  const updateInvoiceItem = async (invoice_item) => {
    try {
      const payload = {
        item_amount: selectedPrice,
        payment_mode: selectedPayMethod.id,
        status: "billed"
      }

      const response = await updateInvoiceItems(auth, payload, invoice_item.id)
      setUpdatedInvoiceItem(response);
      updateInvoiceTotals(response)
    } catch (error) {
      toast.error(error);
    }
  };

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
              onChange={(e) => {
              const selectedOption = patient_insurance_for_this_item.find(
                (mode) => mode.id === parseInt(e.target.value)
              );
              setSelectedPayMethod(selectedOption);

              const inv0 = Array.isArray(inventoryPrices) && inventoryPrices.length > 0 ? inventoryPrices[0] : null;

              if ((selectedOption?.payment_category || '').toLowerCase() !== 'insurance') {
                // Cash-like category (cash, mpesa, cheque, direct_to_bank)
                // Prefer inventory sale_price (if > 0), then fall back to existing values
                let price = 0;
                if (inv0?.sale_price && inv0.sale_price > 0) {
                  price = inv0.sale_price;
                } else if (updatedInvoiceItem?.sale_price && updatedInvoiceItem.sale_price > 0) {
                  price = updatedInvoiceItem.sale_price;
                } else if (updatedInvoiceItem?.item_amount && updatedInvoiceItem.item_amount > 0) {
                  price = updatedInvoiceItem.item_amount;
                } else if (updatedInvoiceItem?.actual_total && updatedInvoiceItem.actual_total > 0) {
                  price = updatedInvoiceItem.actual_total;
                }
                setSelectedPrice(price);
                setSelectedCoPay(0);
              } else {
                // Insurance: pick specific insurance price if available
                const selectedInsurance = inv0?.insurance_sale_prices?.find((mode) => 
                  mode.insurance === selectedOption?.insurance
                );
                
                let price = 0;
                if (selectedInsurance?.price && selectedInsurance.price > 0) {
                  price = selectedInsurance.price;
                } else if (inv0?.sale_price && inv0.sale_price > 0) {
                  // Fallback to cash price if insurance price not found
                  price = inv0.sale_price;
                } else if (updatedInvoiceItem?.item_amount && updatedInvoiceItem.item_amount > 0) {
                  price = updatedInvoiceItem.item_amount;
                } else if (updatedInvoiceItem?.actual_total && updatedInvoiceItem.actual_total > 0) {
                  price = updatedInvoiceItem.actual_total;
                }
                
                const copay = selectedInsurance?.co_pay ?? 0;
                setSelectedPrice(price);
                setSelectedCoPay(copay);
              }
            }}
          >
            <option value="" disabled>Payment Method</option>
            {patient_insurance_for_this_item?.map((mode) => (
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
                <div className="space-y-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    🏥 Insurance: {selectedPayMethod.payment_mode}
                  </span>
                  {inventoryPrices[0]?.insurance_sale_prices?.some(ins => ins.insurance === selectedPayMethod.insurance) ? null : (
                    <span className="block text-xs text-amber-600">
                      ⚠️ Using cash price (no insurance price set)
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {selectedPayMethod.payment_mode}
                </span>
              )}
            </div>
          )}
          </div>
        ) : (<div className='p-2'>{updatedInvoiceItem.payment_mode_name}</div>)}
      </Grid>
      {updatedInvoiceItem?.status !== 'billed' ? (
        <>
          <Grid className='px-2 flex justify-center' item xs={2}>
            {selectedPayMethod && selectedPrice && (
              <div className="mt-2">
                <p>{selectedPrice}</p>
              </div>
            )}
          </Grid>
          <Grid className='px-2 flex justify-center' item xs={2}>
            {selectedPayMethod && selectedPrice && (
              <div className="mt-2">
                <p>{parseInt(selectedPrice) - parseInt(selectedCoPay) }</p>
              </div>
            )}
          </Grid>
        <Grid className='px-2 flex justify-center' item xs={1}>
        {selectedPayMethod && selectedPrice && (
        <button
          onClick={() => updateInvoiceItem(invoiceItem)}
          type="button"
          className="bg-primary text-white px-3 py-2 text-xs rounded-xl"
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
        </button>)}
      </Grid>
        </>

      ): (
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

export default CategorizedItems;
import React, { useEffect, useState } from "react";
import { Grid } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import { formatMoney } from "@/functions/money";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  return [
    {
      action: "invoice_items",
      label: "Invoice Items",
      icon: <CiMoneyCheck1 className="text-success text-xl mx-2" />,
    },
  ];
};

const PaymentCategoryStep = ({ 
  patients, 
  insurance, 
  invoices,
  onUpdate,
  onViewInvoiceItems
}) => {
  const [paymentCategory, setPaymentCategory] = useState(null); // 'cash' or 'credit'
  const [selectedCustomer, setSelectedCustomer] = useState(null); // patient or insurance company
  const [selectedItems, setSelectedItems] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [allMode] = useState('allPages');

  const categoryOptions = [
    { value: 'cash', label: 'Cash (Patient)' },
    { value: 'credit', label: 'Credit (Insurance)' },
  ];

  const handleSelectionChanged = (selectedRowKeys) => {
    setSelectedItems(selectedRowKeys);
  };

  const calculateInvoiceCash = (data) => {
    // If payment category is credit/insurance, use full invoice amount
    if (paymentCategory?.value === 'credit') {
      return parseFloat(data.invoice_amount || 0);
    }
    
    // For cash payments, try to calculate cash portion from items
    let cashAmount = 0;
    if (data.invoice_items && data.invoice_items.length > 0) {
      data.invoice_items.forEach((invoiceItem) => {
        if (invoiceItem?.payment_mode_name?.toLowerCase() === 'cash') {
          cashAmount += parseFloat(invoiceItem.actual_total || 0);
        } else {
          let co_pay = parseFloat(invoiceItem.item_amount || 0) - parseFloat(invoiceItem.actual_total || 0);
          cashAmount += co_pay;
        }
      });
    } else {
      // Fallback to invoice_amount if no items available
      cashAmount = parseFloat(data.invoice_amount || 0);
    }
    return cashAmount;
  };

  const calculateTotalOwed = () => {
    if (!selectedItems?.selectedRowsData?.length) return 0;
    return selectedItems.selectedRowsData.reduce((sum, inv) => {
      const amount = calculateInvoiceCash(inv);
      return sum + amount;
    }, 0);
  };

  const calculateBalance = () => {
    const totalOwed = calculateTotalOwed();
    const paid = parseFloat(payAmount) || 0;
    return totalOwed - paid;
  };

  const handleUpdate = () => {
    if (!paymentCategory) {
      toast.error("Please select a payment category");
      return;
    }
    if (!selectedCustomer) {
      toast.error(paymentCategory.value === 'cash' ? "Please select a patient" : "Please select an insurance company");
      return;
    }
    if (!selectedItems?.selectedRowsData?.length) {
      toast.error("Please select at least one invoice");
      return;
    }
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const totalOwed = calculateTotalOwed();
    const balance = calculateBalance();

    onUpdate({
      paymentCategory: paymentCategory.value,
      customer: selectedCustomer,
      selectedInvoices: selectedItems.selectedRowsData,
      invoiceIds: selectedItems.selectedRowsData.map(inv => inv.id),
      totalOwed,
      payAmount: parseFloat(payAmount),
      balance,
    });
  };

  const actionsFunc = ({ data }) => {
    return (
      <CmtDropdownMenu
        sx={{ cursor: "pointer" }}
        items={getActions()}
        onItemClick={(menu) => {
          if (menu.action === "invoice_items") {
            onViewInvoiceItems(data);
          }
        }}
        TriggerComponent={
          <LuMoreHorizontal className="cursor-pointer text-xl flex items-center" />
        }
      />
    );
  };

  const calculateInvoiceCashAmount = ({ data }) => {
    return calculateInvoiceCash(data);
  };

  const totalOwed = calculateTotalOwed();
  const balance = calculateBalance();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Step 1: Payment Category & Customer</h2>
      
      <Grid container spacing={2}>
        {/* Payment Category */}
        <Grid item md={6} xs={12}>
          <label className="text-lg font-semibold text-primary block mb-2">
            Select Payment Category
          </label>
          <Select
            value={paymentCategory}
            isSearchable
            isClearable
            onChange={(opt) => {
              setPaymentCategory(opt);
              setSelectedCustomer(null); // Reset customer when category changes
            }}
            options={categoryOptions}
            placeholder="Choose Cash or Credit"
          />
        </Grid>

        {/* Customer Selection (Patient or Insurance) */}
        {paymentCategory && (
          <Grid item md={6} xs={12}>
            <label className="text-lg font-semibold text-primary block mb-2">
              {paymentCategory.value === 'cash' ? 'Select Patient' : 'Select Insurance Company'}
            </label>
            <Select
              value={selectedCustomer}
              isSearchable
              isClearable
              onChange={setSelectedCustomer}
              options={
                paymentCategory.value === 'cash'
                  ? patients.map((patient) => ({
                      value: patient.id,
                      label: `${patient?.first_name} ${patient?.second_name}`,
                      type: 'patient',
                    }))
                  : insurance.map((ins) => ({
                      value: ins.id,
                      label: ins.name,
                      type: 'insurance',
                    }))
              }
              placeholder={paymentCategory.value === 'cash' ? 'Select a patient' : 'Select an insurance company'}
            />
          </Grid>
        )}
      </Grid>

      {/* Invoice Grid */}
      {selectedCustomer && (
        <>
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-primary mb-4">Select Invoices</h3>
            <DataGrid
              dataSource={invoices || []}
              allowColumnReordering={true}
              rowAlternationEnabled={true}
              showBorders={true}
              remoteOperations={true}
              showColumnLines={true}
              showRowLines={true}
              wordWrapEnabled={true}
              allowPaging={true}
              className="shadow-xl"
              onSelectionChanged={handleSelectionChanged}
            >
              <Selection mode="multiple" selectAllMode={allMode} />
              <Scrolling rowRenderingMode="virtual" />
              <Paging defaultPageSize={10} />
              <Pager
                visible={true}
                allowedPageSizes={allowedPageSizes}
                showPageSizeSelector={true}
                showInfo={true}
                showNavigationButtons={true}
              />
              <Column dataField="invoice_number" caption="Invoice Number" />
              <Column dataField="invoice_date" caption="Date" />
              <Column dataField="patient_name" caption="Patient" />
              <Column dataField="invoice_amount" caption="Invoice Amount" />
              <Column
                dataField="invoice_amount"
                caption="Cash Portion"
                cellRender={calculateInvoiceCashAmount}
              />
              <Column dataField="cash_paid" caption="Amount Paid" />
              <Column dataField="status" caption="Status" />
              <Column dataField="" caption="" cellRender={actionsFunc} />
            </DataGrid>
          </div>

          {/* Payment Summary */}
          <Grid container spacing={2} className="mt-4 bg-gray-50 p-4 rounded-lg">
            <Grid item md={4} xs={12}>
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Total Owed
                </label>
                <div className="text-2xl font-bold text-primary">
                  {formatMoney(totalOwed)}
                </div>
              </div>
            </Grid>

            <Grid item md={4} xs={12}>
              <label className="block text-sm font-semibold text-gray-600 mb-1">
                Pay Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="block border rounded-md text-sm border-gray py-2 px-4 focus:outline-card w-full"
                placeholder="Enter amount to pay"
              />
            </Grid>

            <Grid item md={4} xs={12}>
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Balance
                </label>
                <div
                  className={`text-2xl font-bold ${
                    balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {formatMoney(Math.abs(balance))}
                </div>
                {balance > 0 && (
                  <div className="text-xs text-red-600 mt-1">Underpayment (Amount Due)</div>
                )}
                {balance < 0 && (
                  <div className="text-xs text-green-600 mt-1">Overpayment (Excess)</div>
                )}
                {balance === 0 && (
                  <div className="text-xs text-gray-600 mt-1">Fully Paid</div>
                )}
              </div>
            </Grid>
          </Grid>

          {/* Update Button */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={handleUpdate}
              className="bg-primary hover:bg-primary-dark rounded-xl text-lg px-8 py-3 text-white font-semibold transition-colors"
            >
              Update - Proceed to Payment Mode
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentCategoryStep;

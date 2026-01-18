import React, { useState, useEffect } from "react";
import { Grid, Button, TextField, CircularProgress } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";
import { formatMoney } from "@/functions/money";

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

const UnifiedSupplierPaymentForm = ({ 
  suppliers, 
  supplierInvoices,
  paymodes,
  onSubmit,
  onViewInvoiceItems,
  loading,
  onFetchSupplierInvoices
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedItems, setSelectedItems] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedPayMode, setSelectedPayMode] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [allMode] = useState('allPages');

  // Fetch supplier invoices when supplier is selected
  useEffect(() => {
    if (selectedSupplier && onFetchSupplierInvoices) {
      onFetchSupplierInvoices(selectedSupplier.value);
    }
  }, [selectedSupplier, onFetchSupplierInvoices]);

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const handleSelectionChanged = (selectedRowKeys) => {
    setSelectedItems(selectedRowKeys);
  };

  const calculateTotalOwed = () => {
    if (!selectedItems?.selectedRowsData?.length) return 0;
    return selectedItems.selectedRowsData.reduce((sum, inv) => {
      const outstanding = getOutstandingAmount(inv);
      return sum + outstanding;
    }, 0);
  };

  const getOutstandingAmount = (invoice) => {
    const totalAmount = parseFloat(invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    return totalAmount - paidAmount;
  };

  const handleSubmit = () => {
    // Validate all fields
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    if (!selectedItems?.selectedRowsData || selectedItems.selectedRowsData.length === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!selectedPayMode) {
      toast.error("Please select a payment mode");
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    // Prepare the payload
    const payload = {
      supplier_id: selectedSupplier.value,
      invoice_ids: selectedItems.selectedRowsData.map(inv => inv.id),
      payment_mode: selectedPayMode.value,
      amount: parseFloat(payAmount),
      reference_number: referenceNumber,
      payment_date: paymentDate,
    };

    // Call parent onSubmit handler
    if (onSubmit) {
      onSubmit(payload, resetForm);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setSelectedItems(null);
    setPayAmount('');
    setSelectedPayMode(null);
    setReferenceNumber('');
    setPaymentDate(getTodayDate());
  };

  const onMenuItemClick = (menu, data) => {
    if (menu.action === 'invoice_items') {
      if (onViewInvoiceItems) {
        onViewInvoiceItems(data);
      }
    }
  };

  const actionsFunc = (cellData) => {
    const userActions = getActions();
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: 'pointer' }}
          items={userActions}
          onItemClick={(menu) => onMenuItemClick(menu, cellData.data)}
          TriggerComponent={<LuMoreHorizontal className='text-xl' />}
        />
      </>
    );
  };

  const totalOwed = calculateTotalOwed();
  const balance = parseFloat(payAmount || 0) - totalOwed;

  // Prepare supplier options
  const supplierOptions = suppliers?.map(sup => ({
    value: sup.id,
    label: sup.official_name || sup.common_name || 'Unknown Supplier',
  })) || [];

  // Prepare payment mode options
  const paymodeOptions = paymodes?.map(mode => ({
    value: mode.id,
    label: mode.name,
  })) || [];

  // Filter supplier invoices
  const filteredInvoices = supplierInvoices?.filter(inv => {
    if (!selectedSupplier) return false;
    return inv.supplier === selectedSupplier.value && inv.status !== 'paid';
  }) || [];

  console.log('Filtered invoices:', filteredInvoices);
  console.log('All supplier invoices:', supplierInvoices);
  console.log('Selected supplier:', selectedSupplier);

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-6">Make Payment to Supplier</h3>
      
      {/* Supplier Selection */}
      <Grid container spacing={3} className="mb-6">
        <Grid item xs={12} md={6}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Supplier *
          </label>
          <Select
            value={selectedSupplier}
            onChange={setSelectedSupplier}
            options={supplierOptions}
            placeholder="Choose supplier..."
            isClearable
            isDisabled={loading}
          />
        </Grid>
      </Grid>

      {/* Invoice Selection - Only show when supplier is selected */}
      {selectedSupplier && (
        <>
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Select Invoices to Pay</h4>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
                <p className="text-gray-500">No outstanding invoices found for this supplier.</p>
                <p className="text-sm text-gray-400 mt-2">All invoices may already be paid, or no invoices exist yet.</p>
              </div>
            ) : (
              <DataGrid
                dataSource={filteredInvoices}
                showBorders={true}
                rowAlternationEnabled={true}
                allowColumnReordering={true}
                allowColumnResizing={true}
                columnAutoWidth={true}
                onSelectionChanged={(e) => handleSelectionChanged(e)}
                height={300}
              >
              <Selection
                mode="multiple"
                selectAllMode={allMode}
                showCheckBoxesMode="always"
              />
              <Scrolling mode="standard" />
              <Paging defaultPageSize={5} />
              <Pager
                visible={true}
                allowedPageSizes={allowedPageSizes}
                displayMode={'compact'}
                showPageSizeSelector={true}
                showInfo={true}
                showNavigationButtons={true}
              />

              <Column
                dataField="invoice_number"
                caption="Invoice #"
                width={120}
              />
              <Column
                dataField="date_created"
                caption="Date"
                dataType="date"
                format="dd/MM/yyyy"
                width={100}
              />
              <Column
                dataField="amount"
                caption="Total Amount"
                dataType="number"
                format="currency"
                width={120}
                cellRender={(data) => (
                  <span>{formatMoney(data.value || 0)}</span>
                )}
              />
              <Column
                dataField="paid_amount"
                caption="Paid"
                dataType="number"
                format="currency"
                width={120}
                cellRender={(data) => (
                  <span>{formatMoney(data.value || 0)}</span>
                )}
              />
              <Column
                caption="Outstanding"
                width={120}
                cellRender={(data) => {
                  const outstanding = getOutstandingAmount(data.data);
                  return <span>{formatMoney(outstanding)}</span>;
                }}
              />
              <Column
                dataField="status"
                caption="Status"
                width={100}
                cellRender={(data) => (
                  <span className={`px-2 py-1 rounded text-xs ${
                    data.value === 'paid' ? 'bg-green-100 text-green-800' :
                    data.value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.value?.toUpperCase()}
                  </span>
                )}
              />
              <Column
                caption="Actions"
                width={80}
                cellRender={actionsFunc}
              />
            </DataGrid>
            )}
          </div>
        </>
      )}

      {/* Payment Details - Only show when invoices are selected */}
      {selectedItems?.selectedRowsData && selectedItems.selectedRowsData.length > 0 && (
        <>
          <h4 className="text-lg font-medium mb-3">Payment Details</h4>
          <Grid container spacing={3} className="mb-6">
            <Grid item xs={12} md={6}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <TextField
                fullWidth
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={loading}
                inputProps={{ step: "0.01", min: "0" }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode *
              </label>
              <Select
                value={selectedPayMode}
                onChange={setSelectedPayMode}
                options={paymodeOptions}
                placeholder="Select payment mode..."
                isClearable
                isDisabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number *
              </label>
              <TextField
                fullWidth
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter reference number"
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <TextField
                fullWidth
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>

          {/* Summary Section */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h5 className="text-md font-semibold mb-3">Payment Summary</h5>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Owed:</span>
                <span className="font-semibold text-lg">
                  {formatMoney(totalOwed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-semibold text-lg">
                  {formatMoney(payAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">Balance:</span>
                <span className={`font-bold text-lg ${
                  balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatMoney(Math.abs(balance))}
                  {balance > 0 && ' (Overpayment)'}
                  {balance < 0 && ' (Underpayment)'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outlined"
              onClick={resetForm}
              disabled={loading}
            >
              Clear Form
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Processing...' : 'Process Payment'}
            </Button>
          </div>
        </>
      )}

      {/* Instructions when no supplier selected */}
      {!selectedSupplier && (
        <div className="text-center py-8 text-gray-500">
          <p>Please select a supplier to view their outstanding invoices</p>
        </div>
      )}

      {/* Instructions when supplier selected but no invoices */}
      {selectedSupplier && (!selectedItems?.selectedRowsData || selectedItems.selectedRowsData.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p>Select invoices to make a payment</p>
        </div>
      )}
    </div>
  );
};

export default UnifiedSupplierPaymentForm;

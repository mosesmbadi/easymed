import React, { useState, useEffect, useCallback } from "react";
import { Grid, Button, TextField, CircularProgress } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllSuppliers, getSupplierInvoicesBySupplier } from "@/redux/features/inventory";
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
  subAccounts,
  onSubmit,
  onViewInvoiceItems,
  loading,
}) => {
  const dispatch = useDispatch();
  const auth = useAuth();

  // Pull data from Redux store — stable references that won't cause DataGrid reset
  const { suppliers, supplierInvoice } = useSelector((store) => store.inventory);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedItems, setSelectedItems] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [selectedSubAccount, setSelectedSubAccount] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [allMode] = useState('allPages');

  // Fetch suppliers on mount
  useEffect(() => {
    if (auth) {
      dispatch(getAllSuppliers(auth));
    }
  }, [auth, dispatch]);

  // Fetch supplier invoices when supplier is selected
  useEffect(() => {
    if (selectedSupplier && auth) {
      dispatch(getSupplierInvoicesBySupplier(auth, selectedSupplier.value));
    }
    // Clear selection when supplier changes
    setSelectedItems(null);
    setSelectedRowKeys([]);
    setPayAmount('');
  }, [selectedSupplier, auth, dispatch]);

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const handleSelectionChanged = useCallback((e) => {
    setSelectedItems(e);
    setSelectedRowKeys(e.selectedRowKeys || []);
  }, []);

  const getOutstandingAmount = (invoice) => {
    const totalAmount = parseFloat(invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    return totalAmount - paidAmount;
  };

  const calculateTotalOwed = () => {
    if (!selectedItems?.selectedRowsData?.length) return 0;
    return selectedItems.selectedRowsData.reduce((sum, inv) => {
      const outstanding = getOutstandingAmount(inv);
      return sum + outstanding;
    }, 0);
  };

  const handleSubmit = () => {
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

    if (!selectedSubAccount) {
      toast.error("Please select a sub account");
      return;
    }

    // Validate sub account has sufficient funds
    const accountBalance = selectedSubAccount.balance || 0;
    if (accountBalance <= 0) {
      toast.error("Selected sub account has zero balance. Cannot make payment.");
      return;
    }
    if (parseFloat(payAmount) > accountBalance) {
      toast.error(`Insufficient funds. Sub account balance is ${formatMoney(accountBalance)} but payment amount is ${formatMoney(payAmount)}.`);
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

    const payload = {
      supplier_id: selectedSupplier.value,
      invoice_ids: selectedItems.selectedRowsData.map(inv => inv.id),
      sub_account: selectedSubAccount.value,
      amount: parseFloat(payAmount),
      reference_number: referenceNumber,
      payment_date: paymentDate,
    };

    if (onSubmit) {
      onSubmit(payload, resetForm);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setSelectedItems(null);
    setSelectedRowKeys([]);
    setPayAmount('');
    setSelectedSubAccount(null);
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

  const totalOwed = calculateTotalOwed();
  const balance = totalOwed - (parseFloat(payAmount) || 0);

  // Supplier dropdown options
  const supplierOptions = (suppliers || []).map(sup => ({
    value: sup.id,
    label: sup.official_name || sup.common_name || 'Unknown Supplier',
  }));

  // Sub account dropdown options — filter out zero-balance accounts
  const subAccountOptions = (subAccounts || [])
    .filter((sa) => sa.active !== false)
    .filter((sa) => parseFloat(sa.balance || 0) > 0)
    .map((sa) => ({
      value: sa.id,
      label: `${sa.name}${sa.main_account_name ? ` (${sa.main_account_name})` : ''} — Bal: ${formatMoney(sa.balance || 0)}`,
      balance: parseFloat(sa.balance || 0),
    }));

  // Filter out already-paid invoices from Redux store data
  const filteredInvoices = (supplierInvoice || []).filter(
    inv => inv.status !== 'paid'
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary mb-4">
        Make Payment to Supplier
      </h2>

      {/* Supplier Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Supplier Information</h3>
        <Grid container spacing={3}>
          <Grid item md={6} xs={12}>
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
      </div>

      {/* Invoice Selection — only show after selecting a supplier */}
      {selectedSupplier && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Invoices to Pay</h3>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
              <p className="text-gray-500">No outstanding invoices found for this supplier.</p>
              <p className="text-sm text-gray-400 mt-2">All invoices may already be paid, or no invoices exist yet.</p>
            </div>
          ) : (
            <DataGrid
              dataSource={filteredInvoices}
              keyExpr="id"
              showBorders={true}
              rowAlternationEnabled={true}
              selectedRowKeys={selectedRowKeys}
              onSelectionChanged={handleSelectionChanged}
              height={300}
            >
              <Selection mode="multiple" selectAllMode={allMode} showCheckBoxesMode="always" />
              <Scrolling mode="virtual" />
              <Paging enabled={true} defaultPageSize={10} />
              <Pager
                visible={true}
                allowedPageSizes={allowedPageSizes}
                displayMode="full"
                showPageSizeSelector={true}
                showInfo={true}
                showNavigationButtons={true}
              />

              <Column
                caption="Actions"
                width={80}
                alignment="center"
                allowFiltering={false}
                allowSorting={false}
                cellRender={(cellData) => (
                  <CmtDropdownMenu
                    sx={{ cursor: "pointer" }}
                    items={getActions()}
                    onItemClick={(menu) => onMenuItemClick(menu, cellData.data)}
                    TriggerComponent={<LuMoreHorizontal className="text-xl" />}
                  />
                )}
              />
              <Column dataField="invoice_number" caption="Invoice #" width={130} />
              <Column
                dataField="date_created"
                caption="Date"
                dataType="date"
                format="yyyy/MM/dd"
                width={110}
              />
              <Column
                dataField="amount"
                caption="Total Amount"
                width={120}
                alignment="right"
                cellRender={(data) => <span>{formatMoney(data.value || 0)}</span>}
              />
              <Column
                dataField="paid_amount"
                caption="Paid"
                width={120}
                alignment="right"
                cellRender={(cellData) => (
                  <span className={parseFloat(cellData.value) > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                    {formatMoney(parseFloat(cellData.value || 0))}
                  </span>
                )}
              />
              <Column
                caption="Outstanding"
                width={120}
                alignment="right"
                calculateCellValue={(data) => getOutstandingAmount(data).toFixed(2)}
                cellRender={(cellData) => (
                  <span className={parseFloat(cellData.value) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    {formatMoney(parseFloat(cellData.value))}
                  </span>
                )}
              />
              <Column
                dataField="status"
                caption="Status"
                width={100}
                cellRender={(cellData) => {
                  const outstanding = getOutstandingAmount(cellData.data);
                  const paidAmt = parseFloat(cellData.data?.paid_amount || 0);
                  const isPartial = paidAmt > 0 && outstanding > 0;
                  return (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      cellData.value === 'paid' ? 'bg-green-100 text-green-800' :
                      isPartial ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {isPartial ? 'Partial' : cellData.value?.toUpperCase()}
                    </span>
                  );
                }}
              />
            </DataGrid>
          )}
        </div>
      )}

      {/* Payment Amount & Summary */}
      {selectedItems?.selectedRowsData?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Amount</h3>
          <Grid container spacing={3}>
            <Grid item md={3} xs={6}>
              <div className="bg-blue-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Total Owed:</span>
                <div className="text-xl font-bold text-blue-700">
                  {formatMoney(totalOwed)}
                </div>
              </div>
            </Grid>
            <Grid item md={3} xs={6}>
              <TextField
                fullWidth
                label="Pay Amount"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item md={3} xs={6}>
              <div className={`rounded-lg p-4 ${balance > 0 ? 'bg-red-50' : balance < 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                <span className="text-sm text-gray-600">Balance:</span>
                <div className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                  {formatMoney(Math.abs(balance))}
                </div>
                <div className="text-xs mt-1">
                  {balance > 0 ? '(Underpayment)' : balance < 0 ? '(Overpayment)' : '(Exact)'}
                </div>
              </div>
            </Grid>
            <Grid item md={3} xs={6}>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Invoices Selected:</span>
                <div className="text-xl font-bold text-gray-700">
                  {selectedItems.selectedRowsData.length}
                </div>
              </div>
            </Grid>
          </Grid>
        </div>
      )}

      {/* Payment Details */}
      {payAmount && parseFloat(payAmount) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
          <Grid container spacing={3}>
            <Grid item md={4} xs={12}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub Account *
              </label>
              <Select
                value={selectedSubAccount}
                onChange={setSelectedSubAccount}
                options={subAccountOptions}
                placeholder="Select sub account..."
                isClearable
                isDisabled={loading}
              />
              {selectedSubAccount && (
                <div className={`mt-2 text-sm font-medium ${
                  selectedSubAccount.balance >= parseFloat(payAmount || 0) ? 'text-green-600' : 'text-red-600'
                }`}>
                  Available Balance: {formatMoney(selectedSubAccount.balance)}
                  {selectedSubAccount.balance < parseFloat(payAmount || 0) && (
                    <span className="block text-xs text-red-500 mt-1">
                      ⚠ Insufficient funds for this payment amount
                    </span>
                  )}
                </div>
              )}
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                fullWidth
                label="Reference Number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter reference number"
                required
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </div>
      )}

      {/* Submit Button */}
      {payAmount && parseFloat(payAmount) > 0 && (
        <div className="flex justify-end">
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSubmit}
            disabled={loading || (selectedSubAccount && selectedSubAccount.balance < parseFloat(payAmount || 0))}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              textTransform: 'none',
              borderRadius: '8px',
              boxShadow: 3,
            }}
          >
            {loading ? 'Processing...' : 'Process Payment'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UnifiedSupplierPaymentForm;

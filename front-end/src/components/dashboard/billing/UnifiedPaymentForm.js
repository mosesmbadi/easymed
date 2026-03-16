import React, { useState, useEffect } from "react";
import { Grid, Button, TextField, CircularProgress } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getInsuranceInvoices, getPatientInvoices } from "@/redux/features/billing";
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

const UnifiedPaymentForm = ({ 
  patients, 
  insurance, 
  invoices,
  paymodes,
  subAccounts,
  onSubmit,
  onViewInvoiceItems,
  loading
}) => {
  const dispatch = useDispatch();
  const auth = useAuth();
  
  const [paymentCategory, setPaymentCategory] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedItems, setSelectedItems] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedPayMode, setSelectedPayMode] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [allMode] = useState('allPages');

  // Fetch invoices when customer is selected
  useEffect(() => {
    if (selectedCustomer && paymentCategory) {
      if (paymentCategory.value === 'cash') {
        dispatch(getPatientInvoices(auth, selectedCustomer.value, 'pending'));
      } else if (paymentCategory.value === 'credit') {
        dispatch(getInsuranceInvoices(auth, selectedCustomer.value, 'pending'));
      }
    }
  }, [selectedCustomer, paymentCategory, auth, dispatch]);

  const categoryOptions = [
    { value: 'cash', label: 'Cash (Patient)' },
    { value: 'credit', label: 'Credit (Insurance)' },
  ];

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const handleSelectionChanged = (selectedRowKeys) => {
    setSelectedItems(selectedRowKeys);
  };

  const calculateInvoiceCash = (data) => {
    if (paymentCategory?.value === 'credit') {
      const insuranceBalance = parseFloat(
        data.insurance_balance ?? ((data.insurance_total || 0) - (data.insurance_paid || 0))
      );
      return Math.max(0, insuranceBalance || 0);
    }

    const total = parseFloat(data.invoice_amount || 0);
    const alreadyPaid = parseFloat(data.cash_paid || 0);
    return Math.max(0, total - alreadyPaid);
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

  const handleSubmit = () => {
    // Validate Step 1 fields
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

    // Validate Step 2 fields
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

    // Prepare data for submission
    const invoiceIds = selectedItems.selectedRowsData.map(inv => inv.id);
    const totalOwed = calculateTotalOwed();

    const submitData = {
      paymentCategory: paymentCategory.value,
      customer: selectedCustomer,
      invoiceIds,
      payAmount: parseFloat(payAmount),
      totalOwed,
      sub_account: selectedPayMode.value,
      reference_number: referenceNumber,
      payment_date: paymentDate,
    };

    onSubmit(submitData);
  };

  const getCustomerOptions = () => {
    if (!paymentCategory) return [];
    
    if (paymentCategory.value === 'cash') {
      return patients.map(p => ({
        value: p.id,
        label: `${p.first_name} ${p.second_name}`,
      }));
    } else {
      return insurance.map(ins => ({
        value: ins.id,
        label: ins.name || ins.insurance_name || 'Unknown',
      }));
    }
  };

  const getPaymodeOptions = () => {
    return (subAccounts || [])
      .filter((sa) => sa.active !== false)
      .map((sa) => ({
        value: sa.id,
        label: `${sa.name}${sa.main_account_name ? ` (${sa.main_account_name})` : ''}`,
      }));
  };

  const onMenuClick = (menu, data) => {
    if (menu.action === "invoice_items") {
      onViewInvoiceItems(data);
    }
  };

  const totalOwed = calculateTotalOwed();
  const balance = calculateBalance();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-primary mb-4">
        Receive Payment
      </h2>

      {/* Payment Category & Customer Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
        <Grid container spacing={3}>
          <Grid item md={6} xs={12}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Category *
            </label>
            <Select
              options={categoryOptions}
              value={paymentCategory}
              onChange={(option) => {
                setPaymentCategory(option);
                setSelectedCustomer(null);
              }}
              placeholder="Select category..."
              isClearable
            />
          </Grid>
          <Grid item md={6} xs={12}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {paymentCategory?.value === 'cash' ? 'Patient' : 'Insurance Company'} *
            </label>
            <Select
              options={getCustomerOptions()}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              placeholder={paymentCategory ? `Select ${paymentCategory.value === 'cash' ? 'patient' : 'insurance company'}...` : "Select category first..."}
              isDisabled={!paymentCategory}
              isClearable
            />
          </Grid>
        </Grid>
      </div>

      {/* Invoice Selection */}
      {selectedCustomer && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Invoices</h3>
          <DataGrid
            dataSource={invoices}
            showBorders={true}
            rowAlternationEnabled={true}
            onSelectionChanged={(e) => handleSelectionChanged(e)}
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
              cellRender={(data) => {
                return (
                  <CmtDropdownMenu
                    sx={{ cursor: "pointer" }}
                    items={getActions()}
                    onItemClick={(menu) => onMenuClick(menu, data.data)}
                    TriggerComponent={<LuMoreHorizontal className="text-xl" />}
                  />
                );
              }}
            />
            <Column dataField="invoice_number" caption="Invoice #" width={130} />
            <Column dataField="invoice_date" caption="Date" width={110} dataType="date" />
            <Column 
              dataField="patient.first_name" 
              caption="Patient" 
              width={150}
              calculateCellValue={(data) => `${data.patient?.first_name || ''} ${data.patient?.second_name || ''}`}
            />
            <Column 
              caption={paymentCategory?.value === 'credit' ? 'Insurance Total' : 'Invoice Total'} 
              width={120}
              alignment="right"
              calculateCellValue={(data) => {
                const total = paymentCategory?.value === 'credit'
                  ? parseFloat((data.insurance_total ?? data.invoice_amount) || 0)
                  : parseFloat(data.invoice_amount || 0);
                return total.toFixed(2);
              }}
            />
            <Column 
              caption="Paid" 
              width={100}
              alignment="right"
              calculateCellValue={(data) => {
                const paid = paymentCategory?.value === 'credit'
                  ? parseFloat((data.insurance_paid ?? data.cash_paid) || 0)
                  : parseFloat(data.cash_paid || 0);
                return paid.toFixed(2);
              }}
              cellRender={(cellData) => (
                <span className={parseFloat(cellData.value) > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {formatMoney(parseFloat(cellData.value))}
                </span>
              )}
            />
            <Column 
              caption={paymentCategory?.value === 'credit' ? 'Insurance Balance' : 'Balance Due'} 
              width={120}
              alignment="right"
              calculateCellValue={(data) => calculateInvoiceCash(data).toFixed(2)}
              cellRender={(cellData) => (
                <span className={parseFloat(cellData.value) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {formatMoney(parseFloat(cellData.value))}
                </span>
              )}
            />
            <Column dataField="status" caption="Status" width={100}
              cellRender={(cellData) => {
                const paid = paymentCategory?.value === 'credit'
                  ? parseFloat((cellData.data?.insurance_paid ?? cellData.data?.cash_paid) || 0)
                  : parseFloat(cellData.data?.cash_paid || 0);
                const total = paymentCategory?.value === 'credit'
                  ? parseFloat((cellData.data?.insurance_total ?? cellData.data?.invoice_amount) || 0)
                  : parseFloat(cellData.data?.invoice_amount || 0);
                const isPartial = paid > 0 && paid < total;
                const statusValue = paymentCategory?.value === 'credit'
                  ? (cellData.data?.insurance_balance <= 0 ? 'paid' : 'pending')
                  : cellData.value;
                return (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    statusValue === 'paid' ? 'bg-green-100 text-green-800' :
                    isPartial ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {isPartial ? 'Partial' : statusValue}
                  </span>
                );
              }}
            />
          </DataGrid>
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

      {/* Payment Mode & Details */}
      {payAmount && parseFloat(payAmount) > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
          <Grid container spacing={3}>
            <Grid item md={4} xs={12}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode *
              </label>
              <Select
                options={getPaymodeOptions()}
                value={selectedPayMode}
                onChange={setSelectedPayMode}
                placeholder="Select payment mode..."
                isClearable
              />
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
            disabled={loading}
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
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default UnifiedPaymentForm;

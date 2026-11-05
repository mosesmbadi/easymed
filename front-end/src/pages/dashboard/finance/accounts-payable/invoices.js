import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Box, Grid, TextField, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Link from 'next/link';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import { toast } from 'react-toastify';
import { Column, Pager, Paging } from 'devextreme-react/data-grid';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from 'react-icons/ci';
import { MdPayment } from 'react-icons/md';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { useAuth } from '@/assets/hooks/use-auth';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import RecordSupplierPaymentModal from '@/components/dashboard/finance/accounts-payable/RecordSupplierPaymentModal';
import SupplierInvoiceDetailsModal from '@/components/dashboard/finance/accounts-payable/SupplierInvoiceDetailsModal';
import { fetchSuppliers, fetchSupplierInvoices, openSupplierInvoiceReport } from '@/redux/service/inventory';
import { formatMoney } from '@/functions/money';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), { ssr: false });

const allowedPageSizes = [10, 25, 50, 'all'];
const BASE = '/dashboard/finance/accounts-payable';

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

const statusStyles = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = { paid: 'Paid', partial: 'Part Paid', pending: 'Pending' };

const viewAction = {
  action: 'view',
  label: 'View Invoice',
  icon: <CiMoneyCheck1 className='text-success text-xl mx-2' />,
};
const payAction = {
  action: 'pay',
  label: 'Record Payment',
  icon: <MdPayment className='text-success text-xl mx-2' />,
};

// Spreadsheets run a cell that starts with one of these as a formula.
const csvText = (value) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const csvAmount = (value) => Number(value || 0).toFixed(2);

const downloadCsv = (invoices) => {
  const header = ['Invoice No', 'Supplier', 'PO Number', 'Date', 'Age (Days)', 'Amount', 'Paid', 'Outstanding', 'Status'];
  const rows = invoices.map((invoice) => [
    csvText(invoice.invoice_no),
    csvText(invoice.supplier_name),
    csvText(invoice.purchase_order_number),
    (invoice.date_created || '').slice(0, 10),
    invoice.age_days ?? '',
    csvAmount(invoice.amount),
    csvAmount(invoice.paid_amount),
    csvAmount(invoice.outstanding_amount),
    statusLabels[invoice.status] || invoice.status,
  ].join(','));

  const url = URL.createObjectURL(
    new Blob([[header.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `supplier-invoices-${new Date().toLocaleDateString('en-CA')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const APInvoicesPage = () => {
  const auth = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [supplier, setSupplier] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    const query = {};
    if (status !== 'all') query.status = status;
    if (supplier) query.supplier = supplier.value;
    if (dateFrom) query.date_from = dateFrom;
    if (dateTo) query.date_to = dateTo;
    if (search.trim()) query.search = search.trim();
    return query;
  }, [status, supplier, dateFrom, dateTo, search]);

  const load = useCallback(() => {
    if (!auth?.token) return;
    setLoading(true);
    fetchSupplierInvoices(auth, params)
      .then(setInvoices)
      .catch(() => toast.error('Could not load supplier invoices'))
      .finally(() => setLoading(false));
  }, [auth?.token, params]);

  // Waits for a pause so a search doesn't fire on every keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!auth?.token) return;
    fetchSuppliers(auth)
      .then((rows) => setSuppliers(rows.map((row) => ({
        value: row.id,
        label: row.official_name || row.common_name,
      }))))
      .catch(() => toast.error('Could not load suppliers'));
  }, [auth?.token]);

  const totals = useMemo(() => invoices.reduce(
    (sum, invoice) => ({
      amount: sum.amount + Number(invoice.amount || 0),
      paid: sum.paid + Number(invoice.paid_amount || 0),
      outstanding: sum.outstanding + Number(invoice.outstanding_amount || 0),
    }),
    { amount: 0, paid: 0, outstanding: 0 }
  ), [invoices]);

  const clearFilters = () => {
    setStatus('all');
    setSupplier(null);
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await openSupplierInvoiceReport(auth, params);
    } catch (error) {
      toast.error('Could not generate the PDF');
    } finally {
      setExporting(false);
    }
  };

  const onMenuClick = (menu, data) => {
    if (menu.action === 'view') setViewing(data);
    if (menu.action === 'pay') setPaying(data);
  };

  const actionsCell = ({ data }) => (
    <CmtDropdownMenu
      items={data.status === 'paid' ? [viewAction] : [viewAction, payAction]}
      onItemClick={(menu) => onMenuClick(menu, data)}
      TriggerComponent={
        <LuMoreHorizontal
          aria-label={`Actions for ${data.invoice_no}`}
          className='cursor-pointer text-xl flex items-center'
        />
      }
    />
  );

  const makePaymentsHref = supplier
    ? `${BASE}/make-payments?supplier=${supplier.value}`
    : `${BASE}/make-payments`;

  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsPayableNav />

      <Box className='bg-white shadow rounded p-4 mb-4'>
        <Grid container spacing={2} alignItems='flex-end'>
          <Grid item xs={12} md={3}>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Status</label>
            <ToggleButtonGroup
              size='small'
              value={status}
              exclusive
              fullWidth
              onChange={(_, value) => value && setStatus(value)}
            >
              {statusOptions.map((option) => (
                <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} md={3}>
            <label htmlFor='ap-invoice-supplier' className='block text-sm font-medium text-gray-700 mb-1'>
              Supplier
            </label>
            <Select
              inputId='ap-invoice-supplier'
              value={supplier}
              onChange={setSupplier}
              options={suppliers}
              isClearable
              placeholder='All suppliers'
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <label htmlFor='ap-invoice-from' className='block text-sm font-medium text-gray-700 mb-1'>
              From Date
            </label>
            <TextField
              id='ap-invoice-from'
              type='date'
              size='small'
              fullWidth
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <label htmlFor='ap-invoice-to' className='block text-sm font-medium text-gray-700 mb-1'>
              To Date
            </label>
            <TextField
              id='ap-invoice-to'
              type='date'
              size='small'
              fullWidth
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button variant='outlined' size='small' fullWidth onClick={clearFilters} sx={{ height: 40 }}>
              Clear Filters
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              size='small'
              fullWidth
              placeholder='Search by invoice number, supplier or PO number'
              inputProps={{ 'aria-label': 'Search supplier invoices' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <div className='flex flex-wrap justify-end gap-2'>
              <Button
                variant='outlined'
                size='small'
                disabled={invoices.length === 0}
                onClick={() => downloadCsv(invoices)}
                sx={{ textTransform: 'none' }}
              >
                Export CSV
              </Button>
              <Button
                variant='outlined'
                size='small'
                disabled={exporting || invoices.length === 0}
                onClick={exportPdf}
                sx={{ textTransform: 'none' }}
              >
                {exporting ? 'Generating...' : 'Export PDF'}
              </Button>
              <Link href={`${BASE}/aging-statements`} className='bg-white shadow text-sm rounded px-3 py-2'>
                Aging Statements
              </Link>
              <Link href={makePaymentsHref} className='bg-primary text-white text-sm rounded px-3 py-2'>
                Make Payments
              </Link>
            </div>
          </Grid>
        </Grid>
      </Box>

      <div className='flex flex-wrap justify-end gap-6 mb-3 text-sm'>
        <span>{loading ? 'Loading...' : `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}</span>
        <span>Invoiced: <strong>{formatMoney(totals.amount)}</strong></span>
        <span>Paid: <strong>{formatMoney(totals.paid)}</strong></span>
        <span>Outstanding: <strong className='text-red-600'>{formatMoney(totals.outstanding)}</strong></span>
      </div>

      <DataGrid
        dataSource={invoices}
        keyExpr='id'
        allowColumnReordering
        rowAlternationEnabled
        showBorders
        showColumnLines
        showRowLines
        wordWrapEnabled
        className='shadow-xl'
      >
        <Paging defaultPageSize={10} />
        <Pager visible allowedPageSizes={allowedPageSizes} showPageSizeSelector showInfo showNavigationButtons />
        <Column dataField='invoice_no' caption='Invoice No.' />
        <Column dataField='supplier_name' caption='Supplier' />
        <Column dataField='purchase_order_number' caption='PO Number' />
        <Column dataField='date_created' caption='Date' dataType='date' format='dd/MM/yyyy' width={110} />
        <Column
          dataField='age_days'
          caption='Age (Days)'
          width={100}
          alignment='center'
          cellRender={({ value }) => {
            if (value === null || value === undefined) return '-';
            let color = '';
            if (value > 60) color = 'text-red-600 font-bold';
            else if (value > 30) color = 'text-orange-600 font-semibold';
            return <span className={color}>{value}</span>;
          }}
        />
        <Column
          dataField='amount'
          caption='Amount'
          alignment='right'
          calculateSortValue={(row) => Number(row.amount)}
          cellRender={({ value }) => formatMoney(value)}
        />
        <Column
          dataField='paid_amount'
          caption='Paid'
          alignment='right'
          cellRender={({ value }) => formatMoney(value)}
        />
        <Column
          dataField='outstanding_amount'
          caption='Outstanding'
          alignment='right'
          calculateSortValue={(row) => Number(row.outstanding_amount)}
          cellRender={({ value }) => formatMoney(value)}
        />
        <Column
          dataField='status'
          caption='Status'
          width={100}
          cellRender={({ value }) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[value] || ''}`}>
              {statusLabels[value] || value}
            </span>
          )}
        />
        <Column caption='' width={50} cellRender={actionsCell} />
      </DataGrid>

      <SupplierInvoiceDetailsModal invoice={viewing} onClose={() => setViewing(null)} />
      <RecordSupplierPaymentModal
        invoice={paying}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null);
          load();
        }}
      />
    </Container>
  );
};

APInvoicesPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APInvoicesPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Container, ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import dynamic from 'next/dynamic';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllInvoices } from '@/redux/features/billing';
import { getAllPatients } from '@/redux/features/patients';
import { Column, Paging, Pager, Scrolling } from 'devextreme-react/data-grid';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { MdLocalPrintshop, MdPayment } from 'react-icons/md';
import { CiMoneyCheck1 } from 'react-icons/ci';
import { downloadPDF } from '@/redux/service/pdfs';
import { updateInvoices } from '@/redux/service/billing';
import { toast } from 'react-toastify';
import ViewInvoiceItems from '@/components/dashboard/billing/ViewInvoiceItemsModal';
import SearchOnlyFilter from '@/components/common/process/SearchOnly';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), { ssr: false });
const allowedPageSizes = [5,10,'all'];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
];

const getActions = (isPaid = false) => {
  const actions = [
    { action: 'print', label: 'Print', icon: <MdLocalPrintshop className='text-success text-xl mx-2' /> },
    { action: 'invoice_items', label: 'Invoice Items', icon: <CiMoneyCheck1 className='text-success text-xl mx-2' /> },
  ];
  if (!isPaid) {
    actions.push({ action: 'mark_paid', label: 'Mark as Paid', icon: <MdPayment className='text-success text-xl mx-2' /> });
  }
  return actions;
};

const InvoicesPage = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const { allInvoices } = useSelector(({ billing }) => billing);
  const { patients } = useSelector(({ patient }) => patient);
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});
  const [processFilter, setProcessFilter] = useState({ search: '' });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({ label: '', value: '' });
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  const items = [
    { label: 'None', value: '' },
    { label: 'Patient First Name', value: 'patient__first_name' },
    { label: 'Patient Second Name', value: 'patient__second_name' },
    { label: 'Invoice Number', value: 'patient_number' },
  ];

  // Single debounced fetch effect covering search + status changes
  const fetchInvoicesDebounced = useCallback(() => {
    if (!auth?.token) return;
    dispatch(getAllInvoices(auth, processFilter, selectedSearchFilter, statusFilter));
  }, [auth, dispatch, processFilter, selectedSearchFilter, statusFilter]);

  // Initial patients load (once when auth available)
  useEffect(() => {
    if (auth?.token) {
      dispatch(getAllPatients(auth));
    }
  }, [auth?.token, dispatch]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchInvoicesDebounced();
    }, 400);
    return () => clearTimeout(id);
  }, [fetchInvoicesDebounced]);

  // Client-side fallback filtering: if statusFilter != 'all', narrow results locally
  const filteredInvoices = statusFilter === 'all'
    ? allInvoices
    : allInvoices.filter(inv => inv.status === statusFilter);

  const handlePrint = async (data) => {
    try {
      const response = await downloadPDF(data.id, '_invoice_pdf', auth);
      window.open(response.url, '_blank');
      toast.success('PDF generated');
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleMarkAsPaid = async (data) => {
    try {
      if (data.status === 'paid') {
        toast.info('Already paid');
        return;
      }
      await updateInvoices(auth, data.id, { status: 'paid' });
      toast.success('Invoice marked as paid');
      // Refresh respecting current status filter
      dispatch(getAllInvoices(auth, processFilter, selectedSearchFilter, statusFilter));
    } catch (e) {
      toast.error('Failed to update invoice');
    }
  };

  const onMenuClick = (menu, data) => {
    if (menu.action === 'invoice_items') {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === 'print') {
      handlePrint(data);
    } else if (menu.action === 'mark_paid') {
      handleMarkAsPaid(data);
    }
  };

  const actionsFunc = ({ data }) => {
    const isPaid = data.status === 'paid';
    const userActions = getActions(isPaid);
    return (
      <CmtDropdownMenu
        sx={{ cursor: 'pointer' }}
        items={userActions}
        onItemClick={(menu) => onMenuClick(menu, data)}
        TriggerComponent={<LuMoreHorizontal className='cursor-pointer text-xl flex items-center' />}
      />
    );
  };

  const statusFunc = ({ data }) => {
    const isPaid = data.status === 'paid';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
        {isPaid ? 'Paid' : 'Pending'}
      </span>
    );
  };

  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsReceivableNav />
      <Box mb={2}>
        <ToggleButtonGroup
          size='small'
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
        >
          {statusOptions.map(opt => (
            <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <SearchOnlyFilter
        selectedFilter={processFilter}
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter}
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />

      <DataGrid
        dataSource={filteredInvoices}
        allowColumnReordering
        rowAlternationEnabled
        showBorders
        remoteOperations
        showColumnLines
        showRowLines
        wordWrapEnabled
        allowPaging
        className='shadow-xl'
      >
        <Scrolling rowRenderingMode='virtual' />
        <Paging defaultPageSize={10} />
        <Pager
          visible
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column dataField='invoice_number' caption='Invoice Number' />
        <Column dataField='invoice_date' caption='Date' />
        <Column dataField='patient_name' caption='Patient' />
        <Column dataField='invoice_amount' caption='Amount' />
        <Column dataField='status' caption='Status' cellRender={statusFunc} />
        <Column dataField='' caption='' cellRender={actionsFunc} />
      </DataGrid>
      {open && <ViewInvoiceItems {...{ setOpen, open, selectedRowData }} />}
    </Container>
  );
};

InvoicesPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default InvoicesPage;

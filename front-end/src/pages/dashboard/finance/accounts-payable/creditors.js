import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Grid, CircularProgress, TextField, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import { Column, Pager, Paging, Scrolling, Summary, TotalItem, Grouping, GroupPanel } from 'devextreme-react/data-grid';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import { useAuth } from '@/assets/hooks/use-auth';
import { FaMoneyBillWave, FaFileInvoiceDollar, FaHandHoldingUsd, FaClock } from 'react-icons/fa';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), {
  ssr: false,
});

const allowedPageSizes = [10, 20, 50, 'all'];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_paid', label: 'Partially Paid' },
];

const APCreditorsPage = () => {
  const auth = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState({
    totalCreditors: 0,
    totalInvoices: 0,
    totalOwed: 0,
    totalPaid: 0,
  });

  // Fetch pending supplier invoices
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all suppliers
        const suppliersRes = await fetch('/api/inventory/fetch-suppliers', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          const allSuppliers = suppliersData.results || suppliersData || [];
          setSuppliers(allSuppliers);
        }

        // Fetch pending supplier invoices
        const invoicesRes = await fetch('/api/inventory/supplier-invoice?status=pending', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          const invoices = invoicesData.results || invoicesData || [];
          
          // Store all invoices for filtering
          setAllInvoices(invoices);
          setPendingInvoices(invoices);

          // Calculate summary
          const totalOwed = invoices.reduce((sum, inv) => {
            const outstanding = parseFloat(inv.amount || 0) - parseFloat(inv.paid_amount || 0);
            return sum + outstanding;
          }, 0);

          const totalPaid = invoices.reduce((sum, inv) => {
            return sum + parseFloat(inv.paid_amount || 0);
          }, 0);

          const uniqueSuppliers = new Set(invoices.map(inv => inv.supplier)).size;

          setSummary({
            totalCreditors: uniqueSuppliers,
            totalInvoices: invoices.length,
            totalOwed: totalOwed,
            totalPaid: totalPaid,
          });
        }
      } catch (error) {
        console.error('Error fetching creditors data:', error);
        toast.error('Failed to load creditors data');
      } finally {
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchData();
    }
  }, [auth?.token]);

  const getOutstandingAmount = (invoice) => {
    const totalAmount = parseFloat(invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    return totalAmount - paidAmount;
  };

  const getAgingDays = (dateCreated) => {
    const invoiceDate = new Date(dateCreated);
    const today = new Date();
    const diffTime = Math.abs(today - invoiceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const supplierNameRender = (cellData) => {
    const supplier = suppliers.find(s => s.id === cellData.value);
    return <span className='font-medium'>{supplier?.official_name || supplier?.common_name || 'Unknown'}</span>;
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Apply filters to invoices
  const filteredInvoices = pendingInvoices.filter(inv => {
    // Status filter
    if (statusFilter !== 'all') {
      const totalPaid = parseFloat(inv.paid_amount || 0);
      const invoiceAmount = parseFloat(inv.amount || 0);
      
      if (statusFilter === 'pending' && totalPaid > 0) return false;
      if (statusFilter === 'partially_paid' && (totalPaid === 0 || totalPaid >= invoiceAmount)) return false;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const invoiceDate = new Date(inv.date_created);
      
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        if (invoiceDate < startDate) return false;
      }
      
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (invoiceDate > endDate) return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <Container maxWidth="xl" className='my-8'>
        <AccountsPayableNav />
        <Box className='bg-white shadow p-6 rounded text-center'>
          <CircularProgress />
          <Typography className='mt-4'>Loading creditors information...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      
      <Box className='mb-6'>
        <Typography variant='h4' className='mb-2'>Creditors (Amounts We Owe)</Typography>
        <Typography variant='body2' color='textSecondary' className='mb-4'>
          Track all pending supplier invoices and manage payables
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={3} className='mb-6'>
          <Grid item xs={12} md={3}>
            <Card className='shadow-md hover:shadow-lg transition-shadow'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Total Creditors
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalCreditors}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Active suppliers
                    </Typography>
                  </div>
                  <FaHandHoldingUsd className='text-5xl text-purple-500 opacity-80' />
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card className='shadow-md hover:shadow-lg transition-shadow'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Pending Invoices
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalInvoices}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Awaiting payment
                    </Typography>
                  </div>
                  <FaFileInvoiceDollar className='text-5xl text-orange-500 opacity-80' />
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card className='shadow-md hover:shadow-lg transition-shadow'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Total Outstanding
                    </Typography>
                    <Typography variant='h4' className='mt-2 text-red-600'>
                      KES {summary.totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Amount payable
                    </Typography>
                  </div>
                  <FaMoneyBillWave className='text-5xl text-red-500 opacity-80' />
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card className='shadow-md hover:shadow-lg transition-shadow'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Partial Payments
                    </Typography>
                    <Typography variant='h4' className='mt-2 text-green-600'>
                      KES {summary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Already paid
                    </Typography>
                  </div>
                  <FaClock className='text-5xl text-green-500 opacity-80' />
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Section */}
        <Box className='mb-4 p-4 bg-gray-50 rounded'>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Typography variant='subtitle2' className='mb-1'>Status</Typography>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(e, newValue) => newValue && setStatusFilter(newValue)}
                size="small"
                fullWidth
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="pending">Pending</ToggleButton>
                <ToggleButton value="partially_paid">Partially Paid</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant='subtitle2' className='mb-1'>From Date</Typography>
              <TextField
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant='subtitle2' className='mb-1'>To Date</Typography>
              <TextField
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
                fullWidth
                size="small"
                className='mt-5'
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Invoices DataGrid */}
        <Box className='bg-white shadow rounded p-4'>
          <div className='flex justify-between items-center mb-4'>
            <Typography variant='h6'>Pending Supplier Invoices</Typography>
            <Typography variant='body2' color='textSecondary'>
              Total Payable: <span className='font-bold text-red-600'>KES {summary.totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Typography>
          </div>
          
          {filteredInvoices.length === 0 ? (
            <div className='text-center py-12 bg-gray-50 rounded'>
              <Typography variant='h6' color='textSecondary'>
                🎉 No invoices match the filters!
              </Typography>
              <Typography variant='body2' color='textSecondary' className='mt-2'>
                Adjust your filters or clear them to see all pending invoices.
              </Typography>
            </div>
          ) : (
            <DataGrid
              dataSource={filteredInvoices}
              showBorders={true}
              rowAlternationEnabled={true}
              allowColumnReordering={true}
              allowColumnResizing={true}
              columnAutoWidth={true}
              wordWrapEnabled={true}
            >
              <GroupPanel visible={true} />
              <Grouping autoExpandAll={false} />
              <Scrolling mode="standard" />
              <Paging defaultPageSize={10} />
              <Pager
                visible={true}
                allowedPageSizes={allowedPageSizes}
                displayMode={'full'}
                showPageSizeSelector={true}
                showInfo={true}
                showNavigationButtons={true}
              />

              <Column
                dataField="supplier"
                caption="Supplier / Creditor"
                width={220}
                groupIndex={0}
                cellRender={supplierNameRender}
              />
              
              <Column
                dataField="invoice_no"
                caption="Invoice #"
                width={150}
              />

              <Column
                dataField="purchase_order_number"
                caption="PO Number"
                width={130}
              />

              <Column
                dataField="date_created"
                caption="Invoice Date"
                dataType="date"
                format="dd/MM/yyyy"
                width={120}
                sortOrder="desc"
              />

              <Column
                caption="Age (Days)"
                width={100}
                alignment="center"
                cellRender={(data) => {
                  const days = getAgingDays(data.data.date_created);
                  let colorClass = 'text-gray-700';
                  if (days > 60) colorClass = 'text-red-600 font-bold';
                  else if (days > 30) colorClass = 'text-orange-600 font-semibold';
                  else if (days > 15) colorClass = 'text-yellow-600';
                  
                  return <span className={colorClass}>{days}</span>;
                }}
              />

              <Column
                dataField="amount"
                caption="Invoice Amount"
                dataType="number"
                format="currency"
                width={150}
                cellRender={(data) => (
                  <span className='font-semibold'>
                    KES {parseFloat(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              />

              <Column
                dataField="paid_amount"
                caption="Paid"
                dataType="number"
                format="currency"
                width={130}
                cellRender={(data) => (
                  <span className='text-green-600'>
                    KES {parseFloat(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              />

              <Column
                caption="Outstanding Balance"
                width={160}
                cellRender={(data) => {
                  const outstanding = getOutstandingAmount(data.data);
                  return (
                    <span className='font-bold text-red-600'>
                      KES {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  );
                }}
              />

              <Column
                dataField="status"
                caption="Status"
                width={110}
                alignment="center"
                cellRender={(data) => (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    data.value === 'paid' ? 'bg-green-100 text-green-800' :
                    data.value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.value?.toUpperCase()}
                  </span>
                )}
              />

              <Summary>
                <TotalItem
                  column="invoice_no"
                  summaryType="count"
                  displayFormat="Total: {0} invoices"
                />
                <TotalItem
                  column="amount"
                  summaryType="sum"
                  valueFormat="currency"
                  customizeText={(data) => {
                    return `Total: KES ${data.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
                <TotalItem
                  column="paid_amount"
                  summaryType="sum"
                  valueFormat="currency"
                  customizeText={(data) => {
                    return `Paid: KES ${data.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
              </Summary>
            </DataGrid>
          )}
        </Box>

        {/* Quick Actions Info */}
        <Box className='mt-4 p-4 bg-blue-50 rounded border border-blue-200'>
          <Typography variant='subtitle2' className='font-semibold mb-2'>
            💡 Quick Actions
          </Typography>
          <Typography variant='body2' color='textSecondary'>
            • Navigate to <strong>Make Payments</strong> to settle outstanding invoices<br />
            • Check <strong>Aging Statements</strong> for detailed payment history<br />
            • Grouped by supplier - expand to see individual invoices
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

APCreditorsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APCreditorsPage;

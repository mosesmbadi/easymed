import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Grid, CircularProgress, TextField, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import { Column, Pager, Paging, Scrolling, Summary, TotalItem, Grouping, GroupPanel } from 'devextreme-react/data-grid';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import { useAuth } from '@/assets/hooks/use-auth';
import { FaMoneyBillWave, FaFileInvoiceDollar, FaUsers, FaClock } from 'react-icons/fa';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), {
  ssr: false,
});

const allowedPageSizes = [10, 20, 50, 'all'];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_paid', label: 'Partially Paid' },
];

const ARDebtorsPage = () => {
  const auth = useAuth();
  const [patients, setPatients] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState({
    totalDebtors: 0,
    totalInvoices: 0,
    totalOwed: 0,
    totalPaid: 0,
  });

  // Fetch unpaid patient/insurance invoices
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch patients
        const patientsRes = await fetch('/api/patient/fetchpatient', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.results || patientsData || []);
        }

        // Fetch insurance companies
        const insuranceRes = await fetch('/api/billing/insurance', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (insuranceRes.ok) {
          const insuranceData = await insuranceRes.json();
          setInsurance(insuranceData.results || insuranceData || []);
        }

        // Fetch unpaid invoices (both patient and insurance)
        const invoicesRes = await fetch('/api/billing/invoices', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          const allInvoicesData = invoicesData.results || invoicesData || [];
          
          // Store all invoices for filtering
          setAllInvoices(allInvoicesData);
          
          // Filter for unpaid/partially paid invoices
          const unpaid = allInvoicesData.filter(inv => {
            const totalPaid = parseFloat(inv.total_paid || 0);
            const invoiceAmount = parseFloat(inv.invoice_amount || 0);
            return totalPaid < invoiceAmount;
          });
          
          setUnpaidInvoices(unpaid);

          // Calculate summary
          const totalOwed = unpaid.reduce((sum, inv) => {
            const outstanding = parseFloat(inv.invoice_amount || 0) - parseFloat(inv.total_paid || 0);
            return sum + outstanding;
          }, 0);

          const totalPaid = unpaid.reduce((sum, inv) => {
            return sum + parseFloat(inv.total_paid || 0);
          }, 0);

          // Count unique debtors (patients + insurance)
          const uniquePatients = new Set(unpaid.filter(inv => inv.patient).map(inv => inv.patient)).size;
          const uniqueInsurance = new Set(unpaid.filter(inv => inv.insurance).map(inv => inv.insurance)).size;

          setSummary({
            totalDebtors: uniquePatients + uniqueInsurance,
            totalInvoices: unpaid.length,
            totalOwed: totalOwed,
            totalPaid: totalPaid,
          });
        }
      } catch (error) {
        console.error('Error fetching debtors data:', error);
        toast.error('Failed to load debtors data');
      } finally {
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchData();
    }
  }, [auth?.token]);

  const getOutstandingAmount = (invoice) => {
    const totalAmount = parseFloat(invoice.invoice_amount || 0);
    const paidAmount = parseFloat(invoice.total_paid || 0);
    return totalAmount - paidAmount;
  };

  const getAgingDays = (dateCreated) => {
    const invoiceDate = new Date(dateCreated);
    const today = new Date();
    const diffTime = Math.abs(today - invoiceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const debtorNameRender = (cellData) => {
    const invoice = cellData.data;
    if (invoice.patient) {
      const patient = patients.find(p => p.id === invoice.patient);
      return <span className='font-medium'>{patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}</span>;
    } else if (invoice.insurance) {
      const ins = insurance.find(i => i.id === invoice.insurance);
      return <span className='font-medium text-blue-600'>{ins?.company_name || 'Unknown Insurance'}</span>;
    }
    return <span>Unknown</span>;
  };

  const debtorTypeRender = (cellData) => {
    const invoice = cellData.data;
    if (invoice.patient) {
      return <span className='px-2 py-1 rounded text-xs bg-purple-100 text-purple-800'>Patient</span>;
    } else if (invoice.insurance) {
      return <span className='px-2 py-1 rounded text-xs bg-blue-100 text-blue-800'>Insurance</span>;
    }
    return <span>-</span>;
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Apply filters to invoices
  const filteredInvoices = unpaidInvoices.filter(inv => {
    // Status filter
    if (statusFilter !== 'all') {
      const totalPaid = parseFloat(inv.total_paid || 0);
      const invoiceAmount = parseFloat(inv.invoice_amount || 0);
      
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
        <AccountsReceivableNav />
        <Box className='bg-white shadow p-6 rounded text-center'>
          <CircularProgress />
          <Typography className='mt-4'>Loading debtors information...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsReceivableNav />
      
      <Box className='mb-6'>
        <Typography variant='h4' className='mb-2'>Debtors (Amounts Owed to Us)</Typography>
        <Typography variant='body2' color='textSecondary' className='mb-4'>
          Track all unpaid patient and insurance invoices
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={3} className='mb-6'>
          <Grid item xs={12} md={3}>
            <Card className='shadow-md hover:shadow-lg transition-shadow'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Total Debtors
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalDebtors}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Patients & Insurance
                    </Typography>
                  </div>
                  <FaUsers className='text-5xl text-indigo-500 opacity-80' />
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
                      Unpaid Invoices
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalInvoices}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Awaiting collection
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
                    <Typography variant='h4' className='mt-2 text-green-600'>
                      KES {summary.totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Amount receivable
                    </Typography>
                  </div>
                  <FaMoneyBillWave className='text-5xl text-green-500 opacity-80' />
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
                    <Typography variant='h4' className='mt-2 text-blue-600'>
                      KES {summary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant='caption' color='textSecondary'>
                      Already received
                    </Typography>
                  </div>
                  <FaClock className='text-5xl text-blue-500 opacity-80' />
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
            <Typography variant='h6'>Unpaid Invoices</Typography>
            <Typography variant='body2' color='textSecondary'>
              Total Receivable: <span className='font-bold text-green-600'>KES {summary.totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Typography>
          </div>
          
          {filteredInvoices.length === 0 ? (
            <div className='text-center py-12 bg-gray-50 rounded'>
              <Typography variant='h6' color='textSecondary'>
                🎉 No invoices match the filters!
              </Typography>
              <Typography variant='body2' color='textSecondary' className='mt-2'>
                Adjust your filters or clear them to see all unpaid invoices.
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
                caption="Debtor Name"
                width={200}
                cellRender={debtorNameRender}
              />

              <Column
                caption="Type"
                width={100}
                alignment="center"
                cellRender={debtorTypeRender}
              />
              
              <Column
                dataField="invoice_number"
                caption="Invoice #"
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
                dataField="invoice_amount"
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
                dataField="total_paid"
                caption="Paid"
                dataType="number"
                format="currency"
                width={130}
                cellRender={(data) => (
                  <span className='text-blue-600'>
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
                    <span className='font-bold text-green-600'>
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
                    data.value === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {data.value === 'partially_paid' ? 'PARTIAL' : data.value?.toUpperCase()}
                  </span>
                )}
              />

              <Summary>
                <TotalItem
                  column="invoice_number"
                  summaryType="count"
                  displayFormat="Total: {0} invoices"
                />
                <TotalItem
                  column="invoice_amount"
                  summaryType="sum"
                  valueFormat="currency"
                  customizeText={(data) => {
                    return `Total: KES ${data.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
                <TotalItem
                  column="total_paid"
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
        <Box className='mt-4 p-4 bg-green-50 rounded border border-green-200'>
          <Typography variant='subtitle2' className='font-semibold mb-2'>
            💡 Quick Actions
          </Typography>
          <Typography variant='body2' color='textSecondary'>
            • Navigate to <strong>Receive Payments</strong> to collect outstanding amounts<br />
            • Use <strong>Reports</strong> for detailed aging analysis<br />
            • Outstanding amounts shown in <span className='text-green-600 font-semibold'>green</span> (money coming in)
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

ARDebtorsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ARDebtorsPage;

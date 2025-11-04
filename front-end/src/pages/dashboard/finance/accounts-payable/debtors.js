import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Card, CardContent, Grid, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import { Column, Pager, Paging, Scrolling, Summary, TotalItem } from 'devextreme-react/data-grid';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import { useAuth } from '@/assets/hooks/use-auth';
import { FaMoneyBillWave, FaFileInvoiceDollar, FaUsers } from 'react-icons/fa';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), {
  ssr: false,
});

const allowedPageSizes = [10, 20, 50, 'all'];

const APDebtorsPage = () => {
  const auth = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSuppliers: 0,
    totalInvoices: 0,
    totalOwed: 0,
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
          setPendingInvoices(invoices);

          // Calculate summary
          const totalOwed = invoices.reduce((sum, inv) => {
            const outstanding = parseFloat(inv.amount || 0) - parseFloat(inv.paid_amount || 0);
            return sum + outstanding;
          }, 0);

          const uniqueSuppliers = new Set(invoices.map(inv => inv.supplier)).size;

          setSummary({
            totalSuppliers: uniqueSuppliers,
            totalInvoices: invoices.length,
            totalOwed: totalOwed,
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
    const totalAmount = parseFloat(invoice.amount || 0);
    const paidAmount = parseFloat(invoice.paid_amount || 0);
    return totalAmount - paidAmount;
  };

  const supplierNameRender = (cellData) => {
    const supplier = suppliers.find(s => s.id === cellData.value);
    return <span>{supplier?.official_name || supplier?.common_name || 'Unknown'}</span>;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className='my-8'>
        <AccountsPayableNav />
        <Box className='bg-white shadow p-6 rounded text-center'>
          <CircularProgress />
          <Typography className='mt-4'>Loading debtors information...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      
      <Box className='mb-6'>
        <Typography variant='h4' className='mb-4'>Supplier Debtors</Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={3} className='mb-6'>
          <Grid item xs={12} md={4}>
            <Card className='shadow-md'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Suppliers with Debt
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalSuppliers}
                    </Typography>
                  </div>
                  <FaUsers className='text-4xl text-blue-500' />
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card className='shadow-md'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Pending Invoices
                    </Typography>
                    <Typography variant='h4' className='mt-2'>
                      {summary.totalInvoices}
                    </Typography>
                  </div>
                  <FaFileInvoiceDollar className='text-4xl text-orange-500' />
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card className='shadow-md'>
              <CardContent>
                <div className='flex items-center justify-between'>
                  <div>
                    <Typography variant='subtitle2' color='textSecondary'>
                      Total Amount Owed
                    </Typography>
                    <Typography variant='h4' className='mt-2 text-red-600'>
                      KES {summary.totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </div>
                  <FaMoneyBillWave className='text-4xl text-red-500' />
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Invoices DataGrid */}
        <Box className='bg-white shadow rounded p-4'>
          <Typography variant='h6' className='mb-4'>Pending Supplier Invoices</Typography>
          
          {pendingInvoices.length === 0 ? (
            <div className='text-center py-12 bg-gray-50 rounded'>
              <Typography variant='h6' color='textSecondary'>
                No pending invoices found
              </Typography>
              <Typography variant='body2' color='textSecondary' className='mt-2'>
                All supplier invoices are paid or no invoices exist yet.
              </Typography>
            </div>
          ) : (
            <DataGrid
              dataSource={pendingInvoices}
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
                dataField="supplier"
                caption="Supplier"
                width={200}
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
                width={150}
              />

              <Column
                dataField="date_created"
                caption="Invoice Date"
                dataType="date"
                format="dd/MM/yyyy"
                width={120}
              />

              <Column
                dataField="amount"
                caption="Total Amount"
                dataType="number"
                format="currency"
                width={140}
                cellRender={(data) => (
                  <span className='font-semibold'>
                    KES {parseFloat(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              />

              <Column
                dataField="paid_amount"
                caption="Paid Amount"
                dataType="number"
                format="currency"
                width={140}
                cellRender={(data) => (
                  <span className='text-green-600'>
                    KES {parseFloat(data.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              />

              <Column
                caption="Outstanding"
                width={140}
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
                width={100}
                cellRender={(data) => (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
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
                  column="amount"
                  summaryType="sum"
                  valueFormat="currency"
                  displayFormat="Total: KES {0}"
                  customizeText={(data) => {
                    return `Total: KES ${data.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
                <TotalItem
                  column="paid_amount"
                  summaryType="sum"
                  valueFormat="currency"
                  displayFormat="Total Paid: KES {0}"
                  customizeText={(data) => {
                    return `Paid: KES ${data.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }}
                />
              </Summary>
            </DataGrid>
          )}
        </Box>
      </Box>
    </Container>
  );
};

APDebtorsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APDebtorsPage;

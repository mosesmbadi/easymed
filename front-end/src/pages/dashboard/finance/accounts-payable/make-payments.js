import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import UnifiedSupplierPaymentForm from '@/components/dashboard/inventory/UnifiedSupplierPaymentForm';
import { useAuth } from '@/assets/hooks/use-auth';

const APMakePaymentsPage = () => {
  const auth = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [paymodes, setPaymodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      try {
        // Fetch suppliers
        const suppliersRes = await fetch('/api/inventory/fetch-suppliers', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          console.log('Suppliers data:', suppliersData);
          setSuppliers(suppliersData.results || suppliersData || []);
        }

        // Fetch payment modes
        const paymodesRes = await fetch('/api/billing/paymentmodes', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (paymodesRes.ok) {
          const paymodesData = await paymodesRes.json();
          console.log('Payment modes:', paymodesData);
          setPaymodes(paymodesData.results || paymodesData || []);
        }

        // Fetch all supplier invoices
        const invoicesRes = await fetch('/api/inventory/supplier-invoice', {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          console.log('Supplier invoices:', invoicesData);
          setSupplierInvoices(invoicesData.results || invoicesData || []);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to load data. Please refresh the page.');
      } finally {
        setInitialLoading(false);
      }
    };

    if (auth?.token) {
      fetchInitialData();
    }
  }, [auth?.token]);

  // Fetch supplier invoices when supplier is selected
  const handleFetchSupplierInvoices = async (supplierId) => {
    try {
      const res = await fetch(`/api/inventory/supplier-invoice?supplier=${supplierId}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSupplierInvoices(data.results || data || []);
      }
    } catch (error) {
      console.error('Error fetching supplier invoices:', error);
      toast.error('Failed to fetch supplier invoices');
    }
  };

  // Handle payment submission
  const handleSubmit = async (payload, resetForm) => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/allocate-supplier-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment processed successfully!');
        
        // Refresh supplier invoices
        if (payload.supplier_id) {
          await handleFetchSupplierInvoices(payload.supplier_id);
        }

        // Reset form
        if (resetForm) {
          resetForm();
        }

        // Optional: Print receipt
        if (data.id) {
          const printConfirm = window.confirm('Payment recorded. Would you like to print the receipt?');
          if (printConfirm) {
            handlePrintReceipt(data.id);
          }
        }
      } else {
        toast.error(data.detail || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('An error occurred while processing the payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle printing receipt
  const handlePrintReceipt = async (receiptId) => {
    try {
      const res = await fetch(`/api/inventory/supplier-payment-receipts/${receiptId}/print`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        toast.error('Failed to generate receipt PDF');
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt');
    }
  };

  if (initialLoading) {
    return (
      <Container maxWidth="xl" className='my-8'>
        <AccountsPayableNav />
        <Box className='bg-white shadow p-6 rounded text-center'>
          <CircularProgress />
          <Typography className='mt-4'>Loading payment form...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box className='bg-white shadow rounded'>
        <UnifiedSupplierPaymentForm
          suppliers={suppliers}
          supplierInvoices={supplierInvoices}
          paymodes={paymodes}
          onSubmit={handleSubmit}
          onFetchSupplierInvoices={handleFetchSupplierInvoices}
          loading={loading}
        />
      </Box>
    </Container>
  );
};

APMakePaymentsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APMakePaymentsPage;

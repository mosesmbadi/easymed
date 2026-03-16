import React, { useEffect, useState } from 'react';
import { Container, Box } from '@mui/material';
import { toast } from 'react-toastify';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import UnifiedSupplierPaymentForm from '@/components/dashboard/inventory/UnifiedSupplierPaymentForm';
import { fetchSubAccounts } from '@/redux/service/billing';
import { useAuth } from '@/assets/hooks/use-auth';

const APMakePaymentsPage = () => {
  const auth = useAuth();
  const [subAccounts, setSubAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch sub accounts on mount
  useEffect(() => {
    if (auth) {
      fetchSubAccounts(auth)
        .then((res) => setSubAccounts(Array.isArray(res) ? res : res?.results || []))
        .catch((err) => console.error('Failed to fetch sub accounts', err));
    }
  }, [auth]);

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

  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box className='bg-white shadow rounded'>
        <UnifiedSupplierPaymentForm
          subAccounts={subAccounts}
          onSubmit={handleSubmit}
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

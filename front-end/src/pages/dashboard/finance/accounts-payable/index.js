import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';

const AccountsPayableIndex = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/requisitions');
  }, [router]);
  return null;
};

AccountsPayableIndex.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default AccountsPayableIndex;

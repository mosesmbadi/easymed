import React from 'react'

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';

const InpatientSettings = () => {
  return (
    <div>InpatientSettings</div>
  )
}

InpatientSettings.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default InpatientSettings
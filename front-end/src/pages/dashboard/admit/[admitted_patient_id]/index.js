import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import React from 'react'

const AdmittedPatient = () => {
  return (
    <div>AdmittedPatient</div>
  )
}

AdmittedPatient.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default AdmittedPatient
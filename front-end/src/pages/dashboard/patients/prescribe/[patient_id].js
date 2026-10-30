import AuthGuard from '@/assets/hoc/auth-guard';
import PrescribePatient from '@/components/dashboard/prescribe/PrescribePatient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import React from 'react'

const PrescribeFromPatientGrid = () => {
  return (
    <PrescribePatient/>
  )
}

export default PrescribeFromPatientGrid;

PrescribeFromPatientGrid.getLayout = (page) => (
    // <ProtectedRoute permission={'CAN_ACCESS_DOCTOR_DASHBOARD'}>
      <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
      </AuthGuard>
    // </ProtectedRoute>
);
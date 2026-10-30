import React from 'react';
import { Container, Box, Typography, Alert } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';

const RadiologyPlaceholderPage = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <Box className='bg-white shadow p-6 rounded'>
        <Typography variant='h5' gutterBottom>Radiology</Typography>
        <Alert severity='info' className='mb-4'>Coming Soon!</Alert>
        <Typography variant='body2' paragraph>
          The Radiology module will manage imaging requests, modality scheduling, workflow status (Requested → Scheduled → Performed → Reported), and image/report access.
        </Typography>
        <Typography variant='subtitle2'>Planned Features:</Typography>
        <ul className='list-disc ml-6 text-sm'>
          <li>Create & track imaging requests (X-Ray, CT, MRI, Ultrasound, etc.)</li>
          <li>Modality worklist with priority and time slot management</li>
          <li>Technologist acquisition status updates</li>
          <li>Radiologist reporting workspace with structured templates</li>
          <li>PACS / DICOM viewer integration (future)</li>
          <li>Billing + authorization linkage</li>
          <li>Turnaround time & workload metrics</li>
        </ul>
      </Box>
    </Container>
  );
};

RadiologyPlaceholderPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default RadiologyPlaceholderPage;

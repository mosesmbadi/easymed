import React, { useEffect } from 'react'
import { useParams } from 'next/navigation';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getOneProcess } from '@/redux/features/patients';
import { Container } from '@mui/material';
import AdmitNav from '@/components/dashboard/admit/AdmitNav';

const AdmittedPatient = () => {
  const params = useParams();
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    dispatch(getOneProcess(auth, params?.admission_process_id));
  }, [params?.admission_process_id]);


  return (
    <Container maxWidth="xl" className="mt-8">
      <AdmitNav />
    </Container>
  )
}

AdmittedPatient.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default AdmittedPatient
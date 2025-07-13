import React, { useEffect } from 'react'
import { useParams } from 'next/navigation';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getOneProcess } from '@/redux/features/patients';

const AdmittedPatient = () => {
  const params = useParams();
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    dispatch(getOneProcess(auth, params?.admission_process_id));
  }, [params?.admission_process_id]);


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
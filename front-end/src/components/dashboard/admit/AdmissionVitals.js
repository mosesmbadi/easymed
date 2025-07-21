import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '@/assets/hooks/use-auth';
import { fetchAdmissionVitals } from '@/redux/features/inpatient';


const AdmissionVitals = ({admission_id}) => {
  const { vitals } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  useEffect(()=> {
    if(!auth.token) return;
    dispatch(fetchAdmissionVitals(auth, admission_id));
  }, []);
  return (
    <div>AdmissionVitals</div>
  )
}

export default AdmissionVitals
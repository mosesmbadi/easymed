import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '@/assets/hooks/use-auth';
import { fetchOneAdmission } from '@/redux/features/inpatient';

const AdmissionDetails = ({admission_id}) => {
  const { oneAdmission } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  useEffect(()=> {
    if(!auth.token) return;
    dispatch(fetchOneAdmission(auth, "", admission_id));
  }, []);
  return (
    <div>{oneAdmission.bed}</div>
  )
}

export default AdmissionDetails
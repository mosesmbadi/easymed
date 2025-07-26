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
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <h2 className='text-xl font-semibold mb-4'>{`Admission ID: ${oneAdmission.admission_id}` }</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <p><strong>Name:</strong> {oneAdmission.patient_first_name}</p>
        <p><strong>Second Name:</strong> {oneAdmission.patient_second_name}</p>

        <p><strong>Age:</strong> {oneAdmission.patient_age}</p>
        <p><strong>Gender:</strong> {oneAdmission.patient_gender}</p>

        <p><strong>Ward:</strong> {oneAdmission.ward}</p>
        <p><strong>Bed:</strong> {oneAdmission.bed}</p>

        <p><strong>Admission Date:</strong> {oneAdmission.admitted_at}</p>
        <p><strong>Admitted By:</strong> {oneAdmission.admitted_by_name}</p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-1 gap-2 mt-8'>
        <p><strong>Reason For Admission:</strong></p>
        <p>{oneAdmission.reason_for_admission}</p>
      </div>
    </div>
  )
}

export default AdmissionDetails
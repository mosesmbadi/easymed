import React, { useEffect } from 'react'

import { getPatientProfile } from '@/redux/features/patients';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllInvoiceItemsByInvoiceId } from '@/redux/features/billing';

const AdmittedPatientDetails = ({patient}) => {
  const dispatch = useDispatch();
  const { profileDetails } = useSelector((store) => store.patient);
  const { invoiceItems } = useSelector((store) => store.billing);
  
  const auth = useAuth();

  useEffect(() => {
    if(auth.token){
      dispatch(getPatientProfile(auth, patient));
    }
  }, [patient]);

  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <h2 className='text-xl font-semibold mb-4'>{`Patient ID: ${profileDetails.unique_id}` }</h2>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <p><strong>Name:</strong> {profileDetails.first_name}</p>
        <p><strong>Second Name:</strong> {profileDetails.second_name}</p>

        <p><strong>Age:</strong> {profileDetails.age}</p>
        <p><strong>Gender:</strong> {profileDetails.gender}</p>

        <p><strong>Email:</strong> {profileDetails.email}</p>
        <p><strong>phone:</strong> {profileDetails.phone}</p>
      </div>
      <div className='mt-4'>
        <h2 className='text-xl font-semibold mb-4'>{`Patient Insurances` }</h2>
        <ul className='list-disc pl-5'>
          {profileDetails.insurances && profileDetails.insurances.map((insurance, index) => (
            <li key={index}>{insurance.name}</li>
          ))}
          {(!profileDetails.insurances || profileDetails.insurances.length === 0) && <li>No insurances found</li>}
        </ul>
      </div>
    </div>
  )
}

export default AdmittedPatientDetails
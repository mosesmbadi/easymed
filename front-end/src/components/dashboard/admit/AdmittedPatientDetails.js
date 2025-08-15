import React, { useEffect } from 'react'

import { getPatientProfile } from '@/redux/features/patients';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllInvoiceItemsByInvoiceId } from '@/redux/features/billing';

const AdmittedPatientDetails = ({patient, invoice}) => {
  const dispatch = useDispatch();
  const { profileDetails } = useSelector((store) => store.patient);
  const { invoiceItems } = useSelector((store) => store.billing);
  
  const auth = useAuth();

  useEffect(() => {
    if(auth.token){
      dispatch(getPatientProfile(auth, patient));
      dispatch(getAllInvoiceItemsByInvoiceId(auth, invoice))
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
      <div className='mt-4'>
        <h2 className='text-xl font-semibold mb-4'>Patient Invoices</h2>
        
        {/* Check if there are any invoices to display */}
        {invoiceItems && invoiceItems.length > 0 ? (
          <div className="overflow-x-auto ">
            <table className="min-w-full divide-y divide-white_light border border-white_light rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium gray_darkest uppercase tracking-wider">
                    Item Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium gray_darkest uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium gray_darkest uppercase tracking-wider">
                    Payment Mode
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium gray_darkest uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-white_light">
                {invoiceItems.map((invoiceItem, index) => (
                  <tr key={index}>
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium gray_darkest">
                      {invoiceItem.item_name}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm gray_darkest">
                      {invoiceItem.item_amount}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm gray_darkest">
                      {invoiceItem.payment_mode_name}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm gray_darkest">
                      {invoiceItem.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Display a message if no invoices are found
          <p>No Invoice found</p>
        )}
      </div>
    </div>
  )
}

export default AdmittedPatientDetails
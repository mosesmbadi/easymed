import React from 'react'
import MpesaPayModal from './MpesaPayModal'
import { ErrorMessage, Field } from 'formik'

const PayAmountsDisplay = (
    {    
        appointmentCashSum,
        prescribedDrugsCashSum,
        labReqCashSum,
        appointmentInsuranceSum,
        prescribedDrugsInsuranceSum,
        labReqInsuranceSum,
        appointmentSum,
        prescribedDrugsSum,
        labReqSum,
    }

    ) => {
  return (
    <div className='flex flex-col gap-4 w-full'>

        <div className='flex flex-col justify-end space-y-2 w-full'>
            <div className='flex justify-end'>
                <div className='border-b border-[#D3D3D3] w-48 justify-between flex'>
                    <h2 className='border-b border-[#D3D3D3] w-full '>Cash</h2>
                    <h2 className='border-b border-[#D3D3D3] w-24 '>{appointmentCashSum + prescribedDrugsCashSum + labReqCashSum}</h2>
                </div>
            </div>

            <div className='flex justify-end'>
                <div className='border-b border-[#D3D3D3] w-48 justify-between flex'>
                    <h2 className='border-b border-[#D3D3D3] w-full '>Insurance</h2>
                    <h2 className='border-b border-[#D3D3D3] w-24 '>{appointmentInsuranceSum + prescribedDrugsInsuranceSum + labReqInsuranceSum}</h2>
                </div>
            </div>
            <div className='flex justify-end'>
                <div className='border-b border-[#D3D3D3] w-48 justify-between flex'>
                    <h2 className='border-b border-[#D3D3D3] w-full '>Total</h2>
                    <h2 className='border-b border-[#D3D3D3] w-24 '>{appointmentSum + prescribedDrugsSum + labReqSum}</h2>
                </div>
            </div>
        </div>

        {/* <div className='flex h-full w-full justify-end'>
            <div className='w-48'>
                <Field
                    className="block border rounded-md text-sm border-gray py-4 px-4 focus:outline-card w-full"
                    maxWidth="sm"
                    placeholder="Cash Paid"
                    name="cash_paid"
                />
                <ErrorMessage
                    name="cash_paid"
                    component="div"
                    className="text-warning text-xs"
                />
            </div>
        </div> */}

 
    </div>
  )
}

export default PayAmountsDisplay
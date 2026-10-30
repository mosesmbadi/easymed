import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch  } from 'react-redux';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';

import { getAllLabTestByProcessId, getAllLabTestPanels } from '@/redux/features/laboratory';
import { useAuth } from '@/assets/hooks/use-auth';
import TestResultsAccordion from '../TestResultsAccordion';
import { fetchPatientById } from '@/redux/service/patients';

const ApproveResults = ({ selectedData, approveOpen, setApproveOpen }) => {
    const [loading, setLoading] = useState(false)
    const [testPatient, setTestPatient]=useState({})
    const dispatch = useDispatch()
    const auth = useAuth()
    const { labRequestsByProcess } = useSelector((store)=> store.laboratory)

    const handleClose = () => {
        setApproveOpen(false);
    };

    const getPatientDetailsForThisTestRequest = async () => {
        try{
            const response = await fetchPatientById(selectedData?.patient, auth)
            setTestPatient(response);
        }catch(error){
            console.log("ERROR GETTING PATIENT")
        }
    }

    useEffect(()=> {
        if(auth){
            dispatch(getAllLabTestPanels(auth))
            dispatch(getAllLabTestByProcessId(selectedData?.process_test_req, auth)) 
            getPatientDetailsForThisTestRequest()
        }
    }, [selectedData])

    const processTestRequests = labRequestsByProcess.map((testReq)=>{
        return(
            <TestResultsAccordion key={`testReq-${testReq.id}`} testReq={testReq}/>
        )
    })

  return (
    <div>
        <Dialog
            fullWidth
            maxWidth="md"
            open={approveOpen}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                <div className='flex items-center min-h-6 px-2 bg-yellow-200 py-2'>
                    <div className='flex w-full'>
                        <p className='text-xs w-full font-semibold'>{`--id: ${testPatient.unique_id}`}</p>
                        <p className='text-xs w-full font-semibold'>{`--name: ${testPatient.first_name} ${testPatient.second_name}`}</p>
                        <p className='text-xs w-full font-semibold'>{`--phone: ${testPatient.phone}`}</p>
                        <p className='text-xs w-full font-semibold'>{`-- ${testPatient.gender}`}</p>
                        <p className='text-xs w-full font-semibold'>{`-- ${testPatient.age} years`}</p>
                    </div>
                </div>
            </DialogTitle>
            <DialogContent>
            {processTestRequests}
            </DialogContent>
        </Dialog>      
    </div>
  )
}

export default ApproveResults
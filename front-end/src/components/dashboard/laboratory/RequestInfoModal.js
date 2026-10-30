import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { toast } from "react-toastify";
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllLabTestPanels, getAllSamplesForProcessId } from '@/redux/features/laboratory';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPatientById } from '@/redux/service/patients';
import SamplesAccordion from './SamplesAccordion';

const RequestInfoModal = ({requestInfoOpen, setRequestInfoOpen, selectedRowData}) => {
    const [loading, setLoading] = useState(false);
    const { labSamplesByProcess} = useSelector((store) => store.laboratory);
    const [testPatient, setTestPatient]=useState({})
    const auth = useAuth();
    const dispatch = useDispatch();

    const handleClose = () => {
        setRequestInfoOpen(false);
    };

    const getPatientDetailsForThisTestRequest = async () => {
        try{
            const response = await fetchPatientById(selectedRowData?.patient, auth)
            setTestPatient(response);
        }catch(error){
            console.log("ERROR GETTING PATIENT")
        }
    }

    useEffect(()=> {
        if(auth){
            dispatch(getAllLabTestPanels(auth))
            dispatch(getAllSamplesForProcessId(selectedRowData?.process_test_req, auth)) 
            getPatientDetailsForThisTestRequest()
        }
    }, [selectedRowData])

    const samplesByProcess = labSamplesByProcess.map((sample)=>{
        return(
            <SamplesAccordion key={`phlebotomy-sample-${sample.id}`} sample={sample}/>
        )
    })

  return (
    <div>
        <Dialog
            fullWidth
            maxWidth="md"
            open={requestInfoOpen}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                <div className='flex items-center min-h-6 justify-between px-2 bg-yellow-200 py-2'>
                    <div>
                        <p className='text-xs font-semibold'>{`PId: ${testPatient.unique_id}`}</p>
                        <p className='text-xs font-semibold'>{`Name: ${testPatient.first_name} ${testPatient.second_name}`}</p>
                        <p className='text-xs font-semibold'>{`Gender: ${testPatient.gender}`}</p>
                        <p className='text-xs font-semibold'>{`Age: ${testPatient.age}`}</p>
                        <p className='text-xs font-semibold'>{`Email: ${testPatient.email}`}</p>
                        <p className='text-xs font-semibold'>{`Phone: ${testPatient.phone}`}</p>
                    </div>
                </div>
            </DialogTitle>
            <DialogContent>
                <h2 className='text-sm font-bold text-primary w-1/3 mb-4 border-gray border-b px-4'>Requested Tests</h2>
                {samplesByProcess}
            </DialogContent>
        </Dialog>      
    </div>
  )
}

export default RequestInfoModal

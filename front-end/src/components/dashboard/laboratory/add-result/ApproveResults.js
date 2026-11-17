import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch  } from 'react-redux';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';

import { getAllLabTestByProcessId, getAllLabTestPanels } from '@/redux/features/laboratory';
import { useAuth } from '@/assets/hooks/use-auth';
import TestResultsAccordion from '../TestResultsAccordion';
import { fetchPatientById } from '@/redux/service/patients';
import { fetchLabTestPanelsByTestRequestId, updateLabRequestPanels } from '@/redux/service/laboratory';
import { toast } from 'react-toastify';

const ApproveResults = ({ selectedData, approveOpen, setApproveOpen }) => {
    const [loading, setLoading] = useState(false)
    const [testPatient, setTestPatient]=useState({})
    // Bumped after Approve All so each test's panel list reloads.
    const [refreshKey, setRefreshKey] = useState(0)
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

    // Approves every panel that has a result and isn't approved yet. One
    // request per panel, the same call as the per-line button, so the
    // approver is recorded for the report sign-off as before.
    const approveAll = async () => {
        setLoading(true)
        let approved = 0
        let failed = 0
        try {
            const panelLists = await Promise.all(
                labRequestsByProcess.map((testReq) => fetchLabTestPanelsByTestRequestId(testReq.id, auth))
            )
            const pending = panelLists.flat().filter(
                (panel) => panel.result !== null && panel.result !== undefined && panel.result !== '' && !panel.result_approved
            )
            if (pending.length === 0) {
                toast.info('No results waiting for approval')
                return
            }
            for (const panel of pending) {
                try {
                    await updateLabRequestPanels({ id: panel.id, result_approved: true }, auth)
                    approved += 1
                } catch (error) {
                    failed += 1
                }
            }
            if (failed) {
                toast.warning(`Approved ${approved} result(s); ${failed} failed`)
            } else {
                toast.success(`Approved ${approved} result(s)`)
            }
        } catch (error) {
            toast.error('Failed to approve results')
        } finally {
            setLoading(false)
            setRefreshKey((key) => key + 1)
        }
    }

    const processTestRequests = labRequestsByProcess.map((testReq)=>{
        return(
            <TestResultsAccordion key={`testReq-${testReq.id}`} testReq={testReq} refreshKey={refreshKey}/>
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
            <div className='flex justify-end mb-3'>
                <button
                    type='button'
                    disabled={loading || labRequestsByProcess.length === 0}
                    onClick={approveAll}
                    className='bg-primary text-white px-4 py-2 text-sm rounded-xl disabled:opacity-50'
                >
                    {loading ? 'Approving...' : 'Approve All'}
                </button>
            </div>
            {processTestRequests}
            </DialogContent>
        </Dialog>      
    </div>
  )
}

export default ApproveResults
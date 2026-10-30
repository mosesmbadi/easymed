import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch  } from 'react-redux';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Form, Formik } from 'formik';

import { getAllLabTestPanels, getAllQualitativeResultPanelsByResult, getAllResultPanelsByResult } from '@/redux/features/laboratory';
import { useAuth } from '@/assets/hooks/use-auth';
import { approveLabResult, approveQualitativeLabResult } from '@/redux/service/laboratory';

const ViewAddedResults = ({resultOpen, setResultOpen, selectedData }) => {
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch()
    const auth = useAuth()
    const { labResultItems, labTestPanels, resultPanels } = useSelector((store)=> store.laboratory)

    // const initialValues = {
    //     lab_results:selectedData.id,
    //     lab_test_request: selectedData.lab_test_request,
    //     approved_by: auth.user_id
    // }

    const handleClose = () => {
        setResultOpen(false);
    };

    useEffect(()=> {
        if(auth){
            dispatch(getAllLabTestPanels(auth))
            if(selectedData && selectedData.labResult !== null){
                dispatch(getAllResultPanelsByResult(selectedData?.labResult, auth))
            }else{
                dispatch(getAllQualitativeResultPanelsByResult(selectedData?.qualitativeLabTest, auth))
            }
        }
    },[auth])

    const theAvailableItems = resultPanels.map((panel)=> {
        const resultTestPanel = labTestPanels.find((testPanel)=> testPanel.id === panel.test_panel)
        if(resultTestPanel){
            return(
                <li key={`${resultTestPanel.id}_panel`} className='flex justify-between '>
                    <span className='w-full p-2'>{resultTestPanel.name}</span>
                    <span className='w-full p-2'>{resultTestPanel.unit}</span>
                    <span className='w-full p-2'>127</span>
                    <span className='w-full p-2'>110</span>
                    <input className='w-full rounded-lg focus:outline-none border border-gray p-2' value={panel.result}/>
                </li>
            )
        }
    })

    const approveLabResults = async (formValue) => {

        const payload = {
            ...formValue
        }

        try{
            setLoading(true)
            let response;
            if(selectedData.category === "quantitative"){
                response = await approveLabResult(payload, auth)
            }else{
                response = await approveQualitativeLabResult(payload, auth)
            }
            setLoading(false)
            console.log("SUCCESS APPROVAL", response)

        }catch(error){
            setLoading(false)
            console.log("FAILED APPROVAL", error)
        }

    }
  return (
    <div>
        <Dialog
            fullWidth
            maxWidth="md"
            open={resultOpen}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                <div className='flex items-center min-h-6 justify-between px-2 bg-yellow-200 py-2'>
                    <p className='font-semibold'>{selectedData.track_number}</p>
                </div>
            </DialogTitle>
            <DialogContent>
            <Formik
                // initialValues={initialValues}
                onSubmit={approveLabResults}
            >
                {({ values, handleChange }) => (
                <Form>
                    <div className='py-4 px-2'>
                        {/* <h2 className='text-sm font-bold text-primary w-1/3 mb-4 border-gray border-b px-4'>Requested Tests</h2> */}
                        <ul className='flex gap-3 flex-col px-4'>
                            <li className='flex justify-between '>
                                <span className='text-primary w-full'>panel name</span>
                                <span className='text-primary w-full'>unit</span>
                                <span className='text-primary w-full'>Ref Val High</span>
                                <span className='text-primary w-full'>Ref Val Low</span>
                                <span className='text-primary w-full'>Result</span>
                            </li>
                            {theAvailableItems}
                        </ul>
                    </div>
                    {/* <div className='flex justify-end py-4'>
                        <button
                            type="submit"
                            disabled={selectedData.approved}
                            className="bg-[#02273D] px-4 py-2 rounded-xl text-white text-sm"
                        >
                            {loading && (
                            <svg
                                aria-hidden="true"
                                role="status"
                                class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                                viewBox="0 0 100 101"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor"
                                ></path>
                                <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                fill="#1C64F2"
                                ></path>
                            </svg>
                            )}
                            {selectedData.approved ? "Approved" : "Approve"}                    
                        </button>
                    </div> */}
                </Form>)}
            </Formik>
            </DialogContent>
        </Dialog>      
    </div>
  )
}

export default ViewAddedResults
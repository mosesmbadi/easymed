import React, {useEffect} from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Container, Grid, Checkbox, FormGroup, FormControlLabel } from '@mui/material';

import { getAllPatientBillingLabRequest } from '@/redux/features/billing';

const LabTestRequests = ({patient_id, setSelectedLabRequests}) => {
    const dispatch = useDispatch()
    const { patientLabRequest } = useSelector((store) => store.billing);

    const handleCheckboxChange = (event, testReq) => {
        const isChecked = event.target.checked;
    
        if (isChecked) {
          // If checkbox is checked, add the testReq to the list of checked items
          setSelectedLabRequests(prevItems => [...prevItems, testReq]);
        } else {
          // If checkbox is unchecked, remove the testReq from the list of checked items
          setSelectedLabRequests(prevItems =>
            prevItems.filter(item => item.id !== testReq.id)
          );
        }
    };

    useEffect(()=>{
        dispatch(getAllPatientBillingLabRequest(patient_id))
    }, [patient_id])

  return (
    <Container className='py-2' maxWidth="xl">
        <Grid item md={12} xs={4}>
            <h2 className='font-bold text-primary'>Lab Test Requests</h2>
        </Grid>
        <ul>
        {patientLabRequest.length > 0 ? patientLabRequest.map((testReq, index) => {
           return (            
                <Grid key={`patientLabRequest-${index}`} item md={4} xs={4}>
                    <div className='flex items-center'>
                        <FormControlLabel 
                            control={<Checkbox sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }}/>} 
                            label={testReq.test_profile_name} 
                            onChange={(event) => handleCheckboxChange(event, testReq)}
                        />
                    </div>
                </Grid>
           )}): <p className='text-warning px-4'> no LabTestRequests found </p>
        }
        </ul>
    </Container>
  )
}

export default LabTestRequests
import React, {useEffect} from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Container, Grid, Checkbox, FormControlLabel } from '@mui/material';

import { getAllPatientBillingPrescribedDrug } from '@/redux/features/billing';

const PrescribedDrug = ({patient_id, setSelectedPrescribedDrugs}) => {
    const dispatch = useDispatch()
    const { patientPrescribedDrug } =  useSelector((store) => store.billing);

    const handleCheckboxChange = (event, drug) => {
        const isChecked = event.target.checked;
    
        if (isChecked) {
          // If checkbox is checked, add the drug to the list of checked items
          setSelectedPrescribedDrugs(prevItems => [...prevItems, drug]);
        } else {
          // If checkbox is unchecked, remove the drug from the list of checked items
          setSelectedPrescribedDrugs(prevItems =>
            prevItems.filter(item => item.id !== drug.id)
          );
        }
    };

    useEffect(()=>{
        dispatch(getAllPatientBillingPrescribedDrug(patient_id))
    }, [patient_id])
  return (
    <Container className='py-2' maxWidth="xl">
        <Grid item md={12} xs={4}>
            <h2 className='font-bold text-primary'>Prescribed Drugs</h2>
        </Grid>
        <ul>
        {patientPrescribedDrug.length > 0 ? patientPrescribedDrug.map((drug, index) => {
           return (            
                <li key={`patientPrescribedDrug-${index}`}>
                    <div className='flex items-center'>
                        <FormControlLabel 
                            control={<Checkbox sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }}/>} 
                            label={drug.item_name} 
                            onChange={(event) => handleCheckboxChange(event, drug)}
                        />
                    </div>
                </li>           

           )}) : <p className='text-warning px-4'> no Prescribed Drug found </p>
        }
        </ul>
    </Container>
  )
}

export default PrescribedDrug
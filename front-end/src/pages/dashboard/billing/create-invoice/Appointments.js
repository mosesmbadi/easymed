import React, {useEffect} from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Container, Grid, Checkbox, FormControlLabel } from '@mui/material';

import { getAllPatientBillingAppointments } from '@/redux/features/billing';

const Appointments = ({patient_id, setSelectedAppointments}) => {
    const dispatch = useDispatch()
    const { patientAppointment } = useSelector((store) => store.billing);

    const handleCheckboxChange = (event, appointment) => {
        const isChecked = event.target.checked;
    
        if (isChecked) {
          // If checkbox is checked, add the appointment to the list of checked items
          setSelectedAppointments(prevItems => [...prevItems, appointment]);
        } else {
          // If checkbox is unchecked, remove the appointment from the list of checked items
          setSelectedAppointments(prevItems =>
            prevItems.filter(item => item.id !== appointment.id)
          );
        }
      };

    useEffect(()=>{
        dispatch(getAllPatientBillingAppointments(patient_id))
    }, [patient_id])
  return (
    <Container className='py-2' maxWidth="xl">
        <Grid item md={12} xs={4}>
            <h2 className='font-bold text-primary'>Appointments</h2>
        </Grid>
        <ul>
        {patientAppointment.length > 0 ? patientAppointment.map((appointment, index) => {
           return (            
                <li key={`patientAppointment-${index}`}>
                    <div className='flex items-center text-xs'>
                        <FormControlLabel 
                            control={<Checkbox sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }}/>} 
                            label={appointment.item_name}
                            onChange={(event) => handleCheckboxChange(event, appointment)}
                        />
                    </div>
                </li>        

           )}) : <p className='text-warning px-4'> no Appointments found </p>
        }
        </ul>
    </Container>
  )
}

export default Appointments
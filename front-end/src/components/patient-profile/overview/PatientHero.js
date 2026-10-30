import React from 'react'
import { Grid } from '@mui/material'
import { Item } from 'devextreme-react/cjs/data-grid'
import BookAppointmentModal from '@/pages/patient-overview/book-appointment-modal'

const PatientHero = ({loggedInPatient}) => {
  return (
    <Grid className='bg-primary text-white rounded-xl flex py-8 px-2 sm:px-8' spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
        <Grid className='w-full' item xs={6}>
            <div className='flex py-4 flex-col'>
                <h2 className='text-2xl sm:text-3xl'>Need To Find A Doctor ?</h2>
                <p>Get Your Medical Service At Your Home</p>
            </div>
            <div className='w-full py-1'>
                {/* <button className='bg-white text-primary p-4 rounded-lg'>
                    Book Appointment
                </button> */}
                <BookAppointmentModal loggedInPatient={loggedInPatient}/>
            </div>
        </Grid>
        <Grid className='w-full hidden sm:block flex flex-col gap-4' item xs={6}>
            <div className='w-full bg-white h-full rounded-lg'>
            </div>
        </Grid>
    </Grid>
  )
}

export default PatientHero
import React,{useEffect} from 'react'
import CustomizedLayout from '@/components/layout/customized-layout'
import { Container } from '@mui/material'
import { MdOutlineKeyboardBackspace } from 'react-icons/md'
import Link from 'next/link'
import BookedAppointmentsDataGrid from '@/components/dashboard/reception-interface/booked-appointments-datagrid';
import { useDispatch,useSelector } from 'react-redux'
import { getAllAppointments } from '@/redux/features/appointment'

const ReceptionPatients = () => {
  const dispatch = useDispatch();
  const { appointments } = useSelector(( store ) => store.appointment)


  return (
    <Container maxWidth="xl" className="mt-8">
        <Link href="/dashboard/reception-interface" className="flex items-center gap-2">
          <MdOutlineKeyboardBackspace className='text-2xl text-primary' />
          <p className='font-bold text-primary'>Back</p>
        </Link>
        <BookedAppointmentsDataGrid {...{appointments}} />
    </Container>
  )
}

ReceptionPatients.getLayout = (page)=>(
    <CustomizedLayout>{page}</CustomizedLayout>
)

export default ReceptionPatients
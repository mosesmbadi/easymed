import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import dynamic from "next/dynamic";
import { Grid } from "@mui/material";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth'
import { getAllAppointmentsByPatientId } from '@/redux/features/appointment'

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const UpcomingAppointments = ({patient, appointments, appointmentsByPatientsId}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const dispatch = useDispatch();
  const auth = useAuth();


  console.log("ALL MY PATIENT APPOINTMENTS", appointmentsByPatientsId)
  console.log("ALL MY UPCOMING PATIENT APPOINTMENTS", appointments)


  useEffect(() => {
    if(patient){
      dispatch(getAllAppointmentsByPatientId(patient?.id))
    }
  }, [patient])

  return (
    <div className='rounded-lg p-4'>
      <div className='flex justify-between items=center mb-2'>
        <h2 className='text-lg sm:text-2xl'>Upcoming Appointments</h2>
        <select className='p-1 rounded-lg focus:outline-none'>
          <option>Latest Appointment</option>
        </select>
      </div>
      <DataGrid
        dataSource={appointments}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        height={"70vh"}
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={5} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column 
          dataField="assigned_doctor"
          caption="Doctor" 
          cellRender={(cellData) => {
            let doctor = cellData.data.assigned_doctor
            return doctor ? doctor : "waiting assignment"
          }}
        />
        <Column 
          dataField="appointment_date_time"
          caption="Date"
          cellRender={(cellData) => {
            let dateString = cellData.data.appointment_date_time
            return dateString.split("T")[0];
          }}
        />
        <Column 
          dataField="appointment_date_time"
          caption="Time" 
          cellRender={(cellData) => {
            const timestamp = cellData.data.appointment_date_time;
            const dateTime = new Date(timestamp);
            return dateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          }}
        />
        <Column 
          dataField="status"
          caption="Status"
        />
        {/* <Column 
          dataField="" 
          caption=""
          cellRender={actionsFunc}
        /> */}
      </DataGrid>
    </div>
  )
}

export default UpcomingAppointments
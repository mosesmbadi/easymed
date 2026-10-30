import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";

import { getAllPatientPrescribedDrugs } from '@/redux/features/patients'
import PatientPrescriptionRequest from './PatientPrescriptionRequest';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const MyPrescriptions = ({patient}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const dispatch = useDispatch();
  const { patientPrescribedDrugs } = useSelector((store) => store.patient);


  console.log("ALL MY PRESCRIBED DRUGS", patientPrescribedDrugs);


  useEffect(()=>{
    if(patient){
      dispatch(getAllPatientPrescribedDrugs(patient.id))
    }
  }, [patient])



  return (
    <div className='w-full p-4 mb-4'>
        <div className='flex justify-between items=center mb-2'>
          <h2 className='text-lg sm:text-2xl'>My Prescriptions</h2>
          <select className='p-1 rounded-lg focus:outline-none'>
            <option>Latest Prescriptions</option>
          </select>
          <PatientPrescriptionRequest/>
        </div>
        <DataGrid
        dataSource={patientPrescribedDrugs}
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
          dataField="item_name"
          caption="Drug" 
        />
        <Column 
          dataField="dosage"
          caption="Dosage"
        />
        <Column 
          dataField="duration"
          caption="Duration"
        />
        <Column 
          dataField="frequency"
          caption="Frequency"
        />
        <Column 
          dataField="sale_price"
          caption="Price" 
        />
        <Column 
          dataField="note"
          caption="Note"
        />
      </DataGrid>
    </div>
  )
}

export default MyPrescriptions
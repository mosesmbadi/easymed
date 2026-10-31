import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Pager } from 'devextreme-react/data-grid';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';

import { getAllPublicPrescriptions } from '@/redux/features/pharmacy';
import { fetchPatientsPage } from '@/redux/service/patients';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const PublicPrescriptionsDatagrid = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const publicPrescriptions = useSelector((store)=> store.prescription.publicPrescriptions);
  // Just the patients on this list, to name them -- not the whole register.
  const [allPatients, setAllPatients] = useState([])

  console.log("PUBLIC PRESCRIPTIONS", publicPrescriptions)

  useEffect(()=>{

    if(auth){
      dispatch(getAllPublicPrescriptions(auth))
    }

  },[auth])

  useEffect(() => {
    const ids = [...new Set((publicPrescriptions || []).map((p) => p.patient).filter(Boolean))];
    if (!auth || ids.length === 0) return;
    fetchPatientsPage(auth, { id__in: ids.join(','), page: 1, page_size: Math.min(ids.length, 200) })
      .then((data) => setAllPatients(data.results))
      .catch(() => setAllPatients([]));
  }, [auth, publicPrescriptions])

  const patientNameRender = (cellData) => {
    const patient = allPatients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""

  }

  return (
    <div>
      <DataGrid
        dataSource={publicPrescriptions}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        rowHeight={4}
        minHeight={"70vh"}
      >
        <Pager
          visible={false}
          // allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={true}
          showNavigationButtons={true}
        />
        <Column 
          dataField="patient" 
          caption="Patient Name" 
          cellRender={patientNameRender}
        />
        <Column 
          dataField="status" 
          caption="Status" 
        />
        <Column 
          dataField="public_prescription" 
          caption="File"
        />
      </DataGrid>
    </div>
  )
}

export default PublicPrescriptionsDatagrid
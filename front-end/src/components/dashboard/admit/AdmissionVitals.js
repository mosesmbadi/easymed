import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth';
import { fetchAdmissionVitals } from '@/redux/features/inpatient';
import AdmissionVitalsModal from './modals/AdmissionVitalsModal';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];


const AdmissionVitals = ({admission_id, triage}) => {
  const showPageSizeSelector = true;
  const showInfo = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showAddVitalsModal, setShowAddVitalsModal] = useState(false);
  const { vitals } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  useEffect(()=> {
    if(!auth.token) return;
    dispatch(fetchAdmissionVitals(auth, admission_id, triage));
  }, []);
  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <div className='w-full flex items-center justify-between mb-4'>
        <h1 className="text-2xl font-semibold mb-4">Admission Vitals</h1>
        <button
          className="bg-primary text-white px-4 py-2 rounded"
          onClick={() => setShowAddVitalsModal(!showAddVitalsModal)}
        >
          New Vitals
        </button>
      </div>
      <DataGrid
        dataSource={vitals}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
      >
        <HeaderFilter visible={true} />
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column
          dataField="date_created"
          caption="Date"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="temperature"
          caption="Temperature"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="height"
          caption="Height"
        />
        <Column
          dataField="weight"
          caption="Weight"
        />
        <Column
          dataField="pulse"
          caption="Pulse"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="diastolic" caption="Diastolic" />
        <Column dataField="systolic" caption="Systolic" />
        <Column dataField="bmi" caption="BMI" />
        <Column dataField="notes" caption="Comments" />
      </DataGrid>

      {showAddVitalsModal && (
        <AdmissionVitalsModal
          showAddVitalsModal={showAddVitalsModal}
          setShowAddVitalsModal={setShowAddVitalsModal}
          admission_id={admission_id}
        />
      )}
    </div>
  )
}

export default AdmissionVitals
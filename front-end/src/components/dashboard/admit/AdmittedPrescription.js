import { useAuth } from '@/assets/hooks/use-auth';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { getAllPrescribedDrugs } from '@/redux/features/pharmacy';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const AdmittedPrescription = ({prescription}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const dispatch = useDispatch();
  const { prescribedDrugs } = useSelector((store) => store.prescription);
  const auth = useAuth();

  useEffect(() => {
    if(auth.token){
      dispatch(getAllPrescribedDrugs(auth, prescription));
    }

  }, [prescription]);

  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <h2 className='text-xl font-semibold mb-4'>{`Patient Prescriptions` }</h2>

      <DataGrid
        dataSource={prescribedDrugs}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={false}
        className="shadow-xl w-full"
      >
        <HeaderFilter visible={true} />
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          showInfo={showInfo}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
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
          dataField="frequency"
          caption="Frequency"
        />
        <Column
          dataField="duration"
          caption="Duration"
        />
        <Column
          dataField="note"
          caption="Note"
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

export default AdmittedPrescription
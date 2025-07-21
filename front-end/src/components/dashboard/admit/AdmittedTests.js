import { useAuth } from '@/assets/hooks/use-auth';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import { getAllLabRequests } from '@/redux/features/laboratory';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];


const AdmittedTests = ({process_test_req}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const dispatch = useDispatch();
  const { labRequests } = useSelector((store) => store.laboratory);
  const auth = useAuth();

  useEffect(() => {
    if(auth.token){
      dispatch(getAllLabRequests(auth, process_test_req));
    }

  }, [process_test_req]);
  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <h2 className='text-xl font-semibold mb-4'>{`Patient Tests` }</h2>

      <DataGrid
        dataSource={labRequests}
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
          dataField="test_profile_name" 
          caption="Test Profile" 
        />
        <Column 
          dataField="requested_on" 
          caption="Date Requested" 
        />
        <Column
          dataField="requested_by_name"
          caption="Requested By"
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

export default AdmittedTests
import { useAuth } from '@/assets/hooks/use-auth';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import { getAllLabRequests, getAllLabTestPanels } from '@/redux/features/laboratory';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import AddInpatientTestModal from './modals/AddInpatientTestModal';
import { MdOutlineContactSupport } from 'react-icons/md';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import ApproveResults from '../laboratory/add-result/ApproveResults';
import TestResultsModal from './modals/TestResultsModal';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "results",
      label: "View results",
      icon: <MdOutlineContactSupport className="text-card text-xl mx-2" />,
    },
  ];

  return actions;
};


const AdmittedTests = ({process, patient}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [labOpen, setLabOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const dispatch = useDispatch();
  const { labRequests } = useSelector((store) => store.laboratory);
  const auth = useAuth();
  const userActions = getActions();

    const onMenuClick = async (menu, data) => {
      if(menu.action === "results"){
        setSelectedData(data);
        setResultOpen(true);
      }
    };
  
    const actionsFunc = ({ data }) => {
      return (
        <>
          <CmtDropdownMenu
            sx={{ cursor: "pointer" }}
            items={userActions}
            onItemClick={(menu) => onMenuClick(menu, data)}
            TriggerComponent={
              <LuMoreHorizontal className="cursor-pointer text-xl" />
            }
          />
        </>
      );
    };

  useEffect(() => {
    if(auth.token){
      dispatch(getAllLabRequests(auth, process?.process_test_req));
      dispatch(getAllLabTestPanels(auth))
    }

  }, [process]);
  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <div className='w-full flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold mb-4'>{patient}</h2>
        <button
          className="bg-primary text-white px-4 py-2 rounded"
          onClick={() => setLabOpen(!labOpen)}
        >
          New Test
        </button>
      </div>

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
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {labOpen && (<AddInpatientTestModal {...{ labOpen, setLabOpen, process }}/>)}
      {resultOpen && (<TestResultsModal selectedData={selectedData} resultOpen={resultOpen} setResultOpen={setResultOpen}/>)}
    </div>
  )
}

export default AdmittedTests
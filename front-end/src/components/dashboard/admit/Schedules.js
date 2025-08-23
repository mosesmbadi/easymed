import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import dynamic from "next/dynamic";
import { GiMedicines } from "react-icons/gi";
import { LuMoreHorizontal } from 'react-icons/lu';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth';
import { admittedPatientSchedules, fetchAdmissionVitals } from '@/redux/features/inpatient';
import MedicatePatient from './modals/MedicatePatient';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "medicate",
      label: "Medicate",
      icon: <GiMedicines className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};


const Schedules = ({admission_id, patient}) => {
  const showPageSizeSelector = true;
  const showInfo = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showAddVitalsModal, setShowAddVitalsModal] = useState(false);
  const { schedules } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();
  const [selectedRowData,setSelectedRowData] = useState({});
  const [medicateOpen, setMedicateOpen] = useState(false);

  const onMenuClick = async (menu, data) => {
    if(menu.action === "medicate"){
      setSelectedRowData(data);
      setMedicateOpen(true);      
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

  useEffect(()=> {
    if(!auth.token) return;
    dispatch(admittedPatientSchedules(auth, admission_id));
  }, []);

  const renderDosage = ({ data }) => {
    return `${data.dosage} X ${data.frequency}`;
  }

  const renderScheduledTime = ({ data }) => {
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    // Function to get the ordinal suffix for a number
    function getOrdinalSuffix(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    }

    const date = new Date(data.schedule_time);
    let hours = date.getHours();
    let minutes = date.getMinutes();

    // Convert hours to 12-hour format
    // Note: The example time '5:45' is for a different input.
    // This code correctly converts the time '11:05' from your provided timestamp.
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    // Pad minutes with a leading zero if needed
    minutes = minutes < 10 ? '0' + minutes : minutes;

    // Get the date components
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    // Combine the parts into the desired format
    return `${hours}:${minutes}, ${day}${getOrdinalSuffix(day)} ${month} ${year}`;

  }

  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <div className='w-full flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold mb-4'>{patient}</h2>
      </div>
      <DataGrid
        dataSource={schedules[0]?.scheduled_drugs}
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
          dataField="drug_name"
          caption="Drug Name"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="frequency"
          caption="Frequency"
          cellRender={renderDosage}
        />

        <Column
          dataField="duration"
          caption="Duration (Days)"
        />

        <Column
          dataField="note"
          caption="Note"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="schedule_time"
          caption="Schedule Time"
          cellRender={renderScheduledTime}
        />
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {medicateOpen && (
        <MedicatePatient
          open={medicateOpen}
          setOpen={setMedicateOpen}
          selectedRowData={selectedRowData}
          admission_id={admission_id}
        />
      )}
    </div>
  )
}

export default Schedules
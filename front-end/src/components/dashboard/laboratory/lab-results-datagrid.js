import React, { useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling,
 } from "devextreme-react/data-grid";
import { labData } from "@/assets/dummy-data/laboratory";
import { Grid } from "@mui/material";
import { MdLocalPrintshop } from "react-icons/md";
import { IoEyeOutline } from "react-icons/io5";

import { downloadResultPDF } from "@/redux/service/pdfs";
import { useAuth } from "@/assets/hooks/use-auth";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ApproveResults from "./add-result/ApproveResults";
import { useSelector } from "react-redux";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "preview",
      label: "Preview Results",
      icon: <IoEyeOutline className="text-primary text-xl mx-2" />,
    },
    {
      action: "approve",
      label: "Approve Results",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
    {
      action: "print",
      label: "Print",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const LabResultDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const auth = useAuth();
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [approveOpen ,setApproveOpen] = useState(false)
  const [selectedData, setSelectedData] = useState(null)
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  const { processes, patients } = useSelector((store)=> store.patient)

  const labTestsResultsSchedules = processes.filter((process)=> process.track==="lab" || process.track === "pharmacy" || process.track === "doctor")
  const searchedProcesses = labTestsResultsSchedules.filter((process)=> process.patient_number.includes(searchQuery))

  const patientNameRender = (cellData) => {
    const patient = patients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""
  }

  const handlePrint = async (data) => {
    try {
      const response = await downloadResultPDF(data.process_test_req, `_labtestresult_pdf`, auth);
      window.open(response.url, '_blank');
      toast.success("PDF ready");
    } catch (error) {
      console.log(error);
      toast.error(error);
    }
  };

  const handlePreview = async (data) => {
    try {
      const response = await downloadResultPDF(data.process_test_req, `_labtestresult_pdf`, auth);
      window.open(response.url, '_blank');
      toast.success("Preview ready");
    } catch (error) {
      console.log(error);
      toast.error(error);
    }
  };

  const onMenuClick = async (menu, data) => {
    if (menu.action === "print"){
      handlePrint(data);
    } else if (menu.action === "preview"){
      handlePreview(data);
    } else if (menu.action === "approve"){
      setSelectedData(data);
      setApproveOpen(true)
    }
  };

  const actionsFunc = ({ data }) => {
    return (
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl flex items-center" />
          }
        />
    );
  };

  return (
    <>
      <Grid className="my-2 flex gap-8 justify-between">
        <Grid className="flex justify-between gap-8 rounded-lg w-full">
          <select className="px-4 w-full py-2 border broder-gray rounded-lg focus:outline-none" name="" id="">
              <option value="" selected>
                All the Items
              </option>
            </select>
        </Grid>
        <Grid className="flex bg-white px-2 items-center rounded-lg w-full" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search by patient ID"
          />
        </Grid>
        <Grid className="bg-primary w-full rounded-md flex items-center text-white" item md={4} xs={4}>
          <Link className="mx-4 w-full text-center" href='/dashboard/laboratory/add-results'>
            Add Test Result
          </Link>
        </Grid>
      </Grid>

      {/* DATAGRID STARTS HERE */}
      <DataGrid
        dataSource={searchedProcesses}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        className="w-full shadow"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column
          dataField="patient_number" 
          caption="PId" 
        />
        <Column
          dataField="patient" 
          caption="Patient Name" 
          cellRender={patientNameRender}
        />
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>

      {approveOpen && (<ApproveResults selectedData={selectedData} approveOpen={approveOpen} setApproveOpen={setApproveOpen}/>)}
    </>
  );
};

export default LabResultDataGrid;

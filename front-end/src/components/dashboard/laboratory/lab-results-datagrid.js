import React, { useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import ServerPager from "@/components/common/ServerPager";
import { useVisitQueue } from "@/assets/hooks/use-visit-queue";
import { labData } from "@/assets/dummy-data/laboratory";
import { Grid } from "@mui/material";
import { MdLocalPrintshop, MdOutlineVerified } from "react-icons/md";
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


// Nothing to preview, approve or print until a result is entered.
const getActions = (hasResults) => [
  {
    action: "preview",
    label: "Preview Results",
    icon: <IoEyeOutline className="text-primary text-xl mx-2" />,
    disabled: !hasResults,
  },
  {
    action: "approve",
    label: "Approve Results",
    icon: <MdOutlineVerified className="text-success text-xl mx-2" />,
    disabled: !hasResults,
  },
  {
    action: "print",
    label: "Print",
    icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    disabled: !hasResults,
  },
];

const ACTIONS_WITH_RESULTS = getActions(true);
const ACTIONS_WITHOUT_RESULTS = getActions(false);

const LabResultDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const auth = useAuth();
  const [approveOpen ,setApproveOpen] = useState(false)
  const [selectedData, setSelectedData] = useState(null)

  const { patients } = useSelector((store)=> store.patient)
  // Visits whose tests have gone back to the doctor or on to the pharmacy,
  // searched by patient ID on the server.
  const queue = useVisitQueue({
    track__in: "lab,pharmacy,doctor",
    search_value: searchQuery,
    search_field: searchQuery ? "patient_number" : "",
  });


  const patientNameRender = (cellData) => {
    // The visit carries the name (or, for a coded sample, the facility's number).
    if (cellData.data.patient_name) return cellData.data.patient_name;
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
          items={data.has_lab_results ? ACTIONS_WITH_RESULTS : ACTIONS_WITHOUT_RESULTS}
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
        dataSource={queue.rows}
        noDataText={queue.loading ? "Loading..." : queue.error || "No lab results"}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        className="w-full shadow"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        {/* The server sends one page; ServerPager below asks for others. */}
        <Paging enabled={false} />
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
      <ServerPager
        page={queue.page}
        pageSize={queue.pageSize}
        total={queue.total}
        loading={queue.loading}
        onPageChange={queue.setPage}
        onPageSizeChange={queue.setPageSize}
      />

      {approveOpen && (<ApproveResults selectedData={selectedData} approveOpen={approveOpen} setApproveOpen={setApproveOpen}/>)}
    </>
  );
};

export default LabResultDataGrid;

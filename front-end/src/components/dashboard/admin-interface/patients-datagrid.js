import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import ServerPager from "@/components/common/ServerPager";
import { useServerList } from "@/assets/hooks/use-server-list";
import { fetchPatientsPage } from "@/redux/service/patients";
import EditPatientDetails from "./edit-patient-details-modal";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { AiFillDelete } from "react-icons/ai";
import { BiEdit } from "react-icons/bi";
import { LuMoreHorizontal } from "react-icons/lu";
import DeletePatientModal from "./delete-patient-modal";
import { Chip, Grid } from "@mui/material";
import { useSelector,useDispatch } from "react-redux";
import AddPatientModal from "../patient/add-patient-modal";
import { useAuth } from "@/assets/hooks/use-auth";


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});


const getActions = () => {
  let actions = [
    {
      action: "delete",
      label: "Delete",
      icon: <AiFillDelete className="text-warning text-xl mx-2" />,
    },
    {
      action: "edit",
      label: "Edit",
      icon: <BiEdit className="text-xl text-success  mx-2" />,
    },
  ];

  return actions;
};

const AdminPatientsDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const dispatch = useDispatch();
  const auth = useAuth()
  const { patientListVersion } = useSelector((store) => store.patient);
  // Searched and paged on the server.
  const patientsPage = useServerList(fetchPatientsPage, { search_value: searchQuery },
    { reloadOn: patientListVersion });

  const onMenuClick = async (menu, data) => {
    if (menu.action === "delete") {
      setSelectedRowData(data);
      setDeleteOpen(true);
    } else if (menu.action === "edit") {
      setSelectedRowData(data);
      setOpen(true);
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

  const statusFunc = ({ data }) => {
    if (data?.progress_status === "In Treatment") {
      return (
        <Chip variant="contained" size="small" label={data.progress_status} className="bg-primary text-white" />
      );
    } else if (data?.progress_status === "Discharged") {
      return (
        <Chip variant="contained" size="small" label={data.progress_status} className="bg-success text-white" />
      );
    } else if (data?.progress_status === "New Patient") {
      return (
        <Chip variant="contained" size="small" label={data.progress_status} className="bg-card text-white" />
      );
    }
  };


  return (
    <section>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="flex items-center rounded-lg bg-white px-2 w-full" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search by name, patient number or phone"
          />
        </Grid>
        <div className="w-full flex justify-end">
         <AddPatientModal />
        </div>
      </Grid>
      <DataGrid
        dataSource={patientsPage.rows}
        noDataText={patientsPage.loading ? "Loading..." : patientsPage.error || "No patients"}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        className="shadow-xl w-full"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        {/* The server sends one page; ServerPager below asks for others. */}
        <Paging enabled={false} />
        <Column
          dataField="first_name"
          caption="First Name"
          width={140}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="second_name"
          caption="Last Name"
          width={140}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="age" caption="Age" width={100} />
        <Column dataField="gender" caption="Gender" width={140} />
        <Column dataField="insurance" caption="Insurance" width={140} />
        <Column dataField="assigned_doctor" caption="Assigned Doctor" width={200} />
        <Column
          dataField=""
          caption="Status"
          width={140}
          cellRender={statusFunc}
        />
        <Column
          dataField="country"
          caption="Action"
          width={140}
          cellRender={actionsFunc}
        />
      </DataGrid>
      <ServerPager
        page={patientsPage.page}
        pageSize={patientsPage.pageSize}
        total={patientsPage.total}
        loading={patientsPage.loading}
        onPageChange={patientsPage.setPage}
        onPageSizeChange={patientsPage.setPageSize}
      />
      <EditPatientDetails {...{ open, setOpen, selectedRowData }} />
      <DeletePatientModal {...{deleteOpen,setDeleteOpen,selectedRowData}} />
    </section>
  );
};

export default AdminPatientsDataGrid;

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import CreateAppointmentModal from "./create-appointment-modal";
import { FaWheelchair } from "react-icons/fa";
import AssignDoctorModal from "./assign-doctor-modal";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "create",
      label: "Convert to Patient",
      icon: <FaWheelchair className="text-success text-xl mx-2" />,
    },
    // {
    //   action: "assign",
    //   label: "Assign Doctor",
    //   icon: <FaWheelchair className="text-success text-xl mx-2" />,
    // },
  ];

  return actions;
};

const BookedAppointmentsDataGrid = ({ appointments }) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRowData, setSelectedRowData] = useState({});
  const userActions = getActions();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  //   filter users based on search query
  const filteredAppointments = appointments.filter((user) => {
    return user.first_name
      .toLocaleLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const onMenuClick = async (menu, data) => {
    if (menu.action === "create") {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === "assign") {
      // setSelectedRowData(data);
      // setAssignOpen(true);
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

  const appointmentDateFunc = ({ data }) => {
    const formattedate = new Date(
      data?.appointment_date_time
    ).toLocaleDateString();
    return <p>{formattedate}</p>;
  };

  const dateCreatedFunc = ({ data }) => {
    const formattedate = new Date(data?.date_created).toLocaleDateString();
    return <p>{formattedate}</p>;
  };

  return (
    <>
      <section className="flex items-center justify-between">
        <div className="mb-2">
          <h1 className="text-xl text-primary uppercase">
            Booked Appointments
          </h1>
        </div>
        <div className="flex items-center justify-end">
          <input
            className="shadow-2xl py-2 px-4 focus:outline-none mb-2 rounded"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            placeholder="Search..."
          />
        </div>
      </section>
      <DataGrid
        dataSource={filteredAppointments}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
        // height={"70vh"}
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
          dataField="gender"
          caption="Action"
          width={100}
          alignment="center"
          cellRender={actionsFunc}
        />
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
        <Column
          dataField="appointment_date_time"
          caption="Date of Appointment"
          width={180}
          cellRender={appointmentDateFunc}
        />
        <Column
          dataField="date_created"
          caption="Date Created"
          width={140}
          cellRender={dateCreatedFunc}
        />
        <Column dataField="date_of_birth" caption="Age" width={140} />
        <Column dataField="reason" caption="Reason" width={280} />
        <Column dataField="gender" caption="Gender" width={100} />
        <Column dataField="status" caption="Status" width={140} />
      </DataGrid>
      <CreateAppointmentModal {...{ open, setOpen, selectedRowData }} />
      <AssignDoctorModal {...{ assignOpen, setAssignOpen, selectedRowData }} />
    </>
  );
};

export default BookedAppointmentsDataGrid;

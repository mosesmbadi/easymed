import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Selection,
  HeaderFilter,
 } from "devextreme-react/data-grid";
import AddPatientModal from "../patient/add-patient-modal";
import DischargePatientModal from "./discharge-patient-modal";
import Link from "next/link";
import { getAllPatients } from "@/redux/features/patients";
import { useSelector,useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const  ReceptionPatientsDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth()
  const { patients } = useSelector((store) => store.patient)


  const users = [
    {
      id_number: "1234821",
      name: "Marcos Ochieng",
      assigned_doctor: "Dr. Patrick",
      progress_status: "Discharged",
      gender: "Male",
      age: "34",
      status: "Active",
    },
    {
      id_number: "70081234",
      name: "Derrick Kimani",
      progress_status: "In Treatment",
      assigned_doctor: "Dr. Moses",
      gender: "Male",
      age: "23",
      status: "Active",
    },
    {
      id_number: "1234821",
      name: "Jane Munyua",
      progress_status: "New Patient",
      assigned_doctor: "Dr. Melanie",
      gender: "Female",
      age: "70",
      status: "Active",
    },
    {
      id_number: "70081234",
      name: "Ann Kibet",
      progress_status: "Discharged",
      assigned_doctor: "Dr. Brenda",
      gender: "Male",
      age: "49",
      status: "Active",
    },
    {
      id_number: "1234221",
      name: "Ann Ochieng",
      progress_status: "In Treatment",
      assigned_doctor: "Dr. Patrick",
      gender: "Female",
      age: "88",
      status: "Active",
    },
  ];

  useEffect(() => {
    dispatch(getAllPatients(auth));
  },[])

  //   filter users based on search query
  const filteredPatients = patients.filter((patient) => {
    return patient?.first_name.toLocaleLowerCase().includes(searchQuery.toLowerCase());
  });

  const onSelectionChanged = (props) => {
    const { selectedRowKeys, selectedRowsData } = props;
    setSelectedRecords(selectedRowKeys);
  };

  const statusFunc = ({ data }) => {
    console.log("DATA_DATA ", data);
    if (data?.progress_status === "In Treatment") {
      return (
        <button className="bg-primary px-2 py-1 text-white">
          {data.progress_status}
        </button>
      );
    } else if (data?.progress_status === "Discharged") {
      return (
        <button className="bg-success text-white px-2 py-1">
          {data.progress_status}
        </button>
      );
    } else if (data?.progress_status === "New Patient") {
      return (
        <button className="bg-card text-white px-2 py-1">
          {data.progress_status}
        </button>
      );
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 justify-between">
        <section className="flex items-center gap-2">
          <div>
            <AddPatientModal />
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/reception-interface/booked-appointments">
              <button className="border border-card text-card font-semibold px-4 py-3 text-sm">
                Public Appointments
              </button>
            </Link>
            <Link href="/dashboard/reception-interface/patient-appointments">
              <button className="border bg-primary text-white px-4 py-3 text-sm">
                Patient Appointments
              </button>
            </Link>
          </div>
        </section>
        <div className="flex items-center gap-2">
          {selectedRecords.length > 0 && (
            <DischargePatientModal {...{ selectedRecords }} />
          )}
          <input
            className="shadow-xl py-3 px-4 focus:outline-none mb-2"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            placeholder="Search..."
          />
        </div>
      </div>
      <h1 className="text-xl font-semibold mt-8 mb-1 uppercase">Patients</h1>
      <DataGrid
        dataSource={filteredPatients}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        onSelectionChanged={onSelectionChanged}
        selectedRowKeys={selectedRecords}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
        // height={"70vh"}
      >
        <Selection
          mode="multiple"
          selectAllMode={"allMode"}
          //showCheckBoxesMode={checkBoxesMode}
        />
        <HeaderFilter visible={true} />
        <Pager
          visible={true}
          // allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={true}
          showNavigationButtons={true}
        />
        <Column
          dataField="first_name"
          caption="First Name"
          width={240}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="second_name"
          caption="Last Name"
          width={240}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="date_of_birth" caption="Date of Birth" width={140} />
        <Column dataField="gender" caption="Gender" width={140} />
        <Column dataField="insurance" caption="Insurance" width={140} />
        <Column dataField="assigned_doctor" caption="Assigned Doctor" width={200} />
        <Column
          dataField="gender"
          caption="Status"
          width={140}
          cellRender={statusFunc}
        />
      </DataGrid>
    </section>
  );
};

export default ReceptionPatientsDataGrid;

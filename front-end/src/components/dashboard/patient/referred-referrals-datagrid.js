import React from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager } from "devextreme-react/data-grid";
import { Chip } from "@mui/material";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const users = [
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Priority",
    hospital: 'Pacific West Hospital'
  },
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Not Priority",
    hospital: 'Mater Hospital'
  },
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Priority",
    hospital: 'Eldoret West Memorial'
  },
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Not Priority",
    hospital: 'Bungoma West Level 4 Hospital'
  },
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Priority",
    hospital: 'Pacific West Hospital'
  },
  {
    date: "12/09/2023",
    id_number: "1234821",
    name: "Marcos Ochieng",
    from: "Priscilla Cheptoo",
    notes: "Salmonela Amino",
    last_modified: "17/08/2023",
    priority: "Not Priority",
    hospital: 'Mater Hospital'
  },
];


const ReferredReferralsDatagrid = () => {

  const priorityFunc = ({ data }) => {
    if (data?.priority === "Priority") {
      return (
        <div className="flex items-center gap-2">
          <p>{data?.name}</p>
          <Chip variant="outlined" size="small" style={{ borderColor: "#FC4B1B" }} label={data?.priority} />
        </div>
      );
    }else{
        return <p>{data?.name}</p>
    }
  };
  
  const fromFunc = ({ data }) => {
    return <div>
      <p>{data?.from}</p>
      <span className="text-xs text-success">{data?.hospital}</span>
    </div>
  }

  return (
    <section>
      <DataGrid
        dataSource={users}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
        height={"70vh"}
      >
        <Pager
          visible={true}
          // allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={true}
          showNavigationButtons={true}
        />
        <Column dataField="date" caption="Date" width={140} />
        <Column dataField="id_number" caption="ID" width={140} />
        <Column
          dataField="name"
          caption="Patient"
          width={240}
          allowFiltering={true}
          allowSearch={true}
          cellRender={priorityFunc}
        />
        <Column dataField="from" caption="From" width={200} cellRender={fromFunc} />
        <Column dataField="notes" caption="Notes" width={200} />
        <Column dataField="last_modified" caption="Last Modified" width={200} />
      </DataGrid>
    </section>
  );
};

export default ReferredReferralsDatagrid;

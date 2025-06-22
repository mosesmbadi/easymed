import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdmitted } from "@/redux/features/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const AdmitPatientDataGrid = () => {
  const showPageSizeSelector = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const showInfo = true;
  const { patients } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();

  // dummy functions and values for now
  const onSelectionChanged = () => {};
  const selectedRecords = [];

  const patientNameRender = () => "John Doe";
  const actionsFunc = () => "Edit/Delete";

  useEffect(() => {
    if(auth.token){
      dispatch(fetchAdmitted(auth));
    }
  }, [auth])

  return (
    <section>
      <DataGrid
        dataSource={patients}
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
          dataField="patient"
          caption="PId"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient"
          caption="Patient Name"
          allowFiltering={true}
          allowSearch={true}
          cellRender={patientNameRender}
        />
        <Column dataField="reason_for_admission" caption="Reason" width={200} />
        <Column dataField="actions" caption="Action" cellRender={actionsFunc} />
      </DataGrid>
    </section>
  );
};

export default AdmitPatientDataGrid;

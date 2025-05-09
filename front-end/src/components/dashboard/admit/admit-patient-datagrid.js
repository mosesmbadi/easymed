import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const AdmitPatientDataGrid = () => {
  const fakeData = []; // empty data for now
  

  // dummy functions and values for now
  const onSelectionChanged = () => {};
  const selectedRecords = [];
  const showPageSizeSelector = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const showInfo = true;
  const patientNameRender = () => "John Doe";
  const actionsFunc = () => "Edit/Delete";

  return (
    <section>
      <DataGrid
        dataSource={fakeData}
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
          dataField="patient_number"
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
        <Column dataField="reason" caption="Reason" width={200} />
        <Column dataField="actions" caption="Action" cellRender={actionsFunc} />
      </DataGrid>
    </section>
  );
};

export default AdmitPatientDataGrid;

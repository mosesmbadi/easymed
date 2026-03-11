import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import { fetchSubAccounts } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";
import SubAccountModal from "./SubAccountModal";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const SubAccountDataGrid = ({ mainAccounts }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const auth = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchSubAccounts(auth);
      setData(res);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      loadData();
    }
  }, [auth]);

  useEffect(() => {
    if (!isModalOpen) {
      loadData();
    }
  }, [isModalOpen]);

  const actionsFunc = ({ data }) => {
    return (
      <button
        onClick={() => {
          setSelectedItem(data);
          setIsModalOpen(true);
        }}
        className="text-primary hover:underline flex items-center gap-1"
      >
        Edit
      </button>
    );
  };

  const statusFunc = ({ data }) => {
    return (
      <span className={data.active ? "text-green-600" : "text-red-500"}>
        {data.active ? "Active" : "Inactive"}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sub Accounts</h2>
        <button
          className="bg-primary text-white px-4 py-2 rounded"
          onClick={() => {
            setSelectedItem(null);
            setIsModalOpen(true);
          }}
        >
          Add Sub Account
        </button>
      </div>

      <DataGrid
        dataSource={data}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={true}
          showInfo={true}
          showNavigationButtons={true}
        />
        <Column dataField="id" caption="ID" width={70} />
        <Column dataField="name" caption="Name" />
        <Column dataField="main_account_name" caption="Main Account" />
        <Column 
          dataField="opening_bal" 
          caption="Opening Bal" 
          width={120} 
          customizeText={(cellInfo) => Number(cellInfo.value).toLocaleString()}
        />
        <Column 
          dataField="active" 
          caption="Status" 
          width={100}
          cellRender={statusFunc}
        />
        <Column 
          dataField="" 
          caption="Action"
          width={100}
          cellRender={actionsFunc}
        />
      </DataGrid>

      <SubAccountModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        mainAccounts={mainAccounts}
      />
    </div>
  );
};

export default SubAccountDataGrid;


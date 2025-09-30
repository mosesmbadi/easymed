import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux';
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { CiSquareQuestion } from "react-icons/ci";
import { MdLocalPrintshop } from 'react-icons/md';

import { useAuth } from '@/assets/hooks/use-auth';
import { getGoodRecieptNotes, getItems } from '@/redux/features/inventory';
import { months } from "@/assets/dummy-data/laboratory";
import SearchOnlyFilter from '@/components/common/process/SearchOnly';
import { downloadPDF } from '@/redux/service/pdfs';
import ViewGrnItemsModal from '../modals/Grn/ViewGrnItems';


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "grn_items",
      label: "View GRN items",
      icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
    },
    {
      action: "print",
      label: "Print",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const IncomingItemsGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();
  const { grns } = useSelector((store) => store.inventory);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})
  const [open, setOpen]=useState(false)
  const [selectedRowData, setSelectedRowData] = useState(null)

  const items = [
    {label: "None", value: ""},
    {label: "Product Name", value: "item__name"},
    {label: "Item Code", value: "item__item_code"},
    {label: "LOT NO", value: "lot_no"},
    {label: "Supplier", value: "supplier__name"},
  ]

  const handlePrint = async (data) => {
    try{
      const response = await downloadPDF(data.id, "_purchaseorder_pdf", auth)
      window.open(response.link, '_blank');
      toast.success("got pdf successfully")

    }catch(error){
      console.log(error)
      toast.error(error)
    }      
  };
  
  const onMenuClick = async (menu, data) => {
    if (menu.action === "grn_items") {
      setSelectedRowData(data);
      setOpen(true);
    }else if (menu.action === "print"){
      handlePrint(data);
    }
  };
  
  const actionsFunc = ({ data }) => {
    return (
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
    );
  };

  useEffect(() => {
    // This effect handles the debouncing logic
    const timerId = setTimeout(() => {
      // Dispatch the action only after a 500ms delay
      if(auth.token){
        // dispatch(getAllgrns(auth, {}, processFilter, selectedSearchFilter));
        dispatch(getGoodRecieptNotes(auth));
      }
    }, 500); // 500ms delay, adjust as needed

    // Cleanup function: clears the timer if searchTerm changes before the delay is over
    return () => {
      clearTimeout(timerId);
    };
  }, [auth]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section className=" my-8">
      <h3 className="text-xl mt-8"> Incoming Items </h3>
      <div className="w-full flex items-center justify-end text-white">
        <Link className="mx-4 rounded-md p-2 bg-primary text-center" href="/dashboard/inventory/incoming-items/new">
          Receive Items
        </Link>
      </div>
      <SearchOnlyFilter
        selectedFilter={processFilter} 
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />
      <DataGrid
        dataSource={grns}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        // height={"70vh"}
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
        <Column dataField="grn_number" caption="Grn Number"/>
        <Column dataField="po_number" caption="PO Number" />
        <Column dataField="requisition_number" caption="Requisition Number"/>
        <Column dataField="note" caption="Note"/>
        <Column 
          dataField="" 
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {open && (<ViewGrnItemsModal open={open} setOpen={setOpen} selectedRowData={selectedRowData} />)}
    </section>

  )
}

export default IncomingItemsGrid
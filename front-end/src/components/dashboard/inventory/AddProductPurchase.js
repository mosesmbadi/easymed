import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/assets/hooks/use-auth";
import { useRouter } from 'next/navigation'
import Link from "next/link";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Selection } from "devextreme-react/data-grid";
import themes from 'devextreme/ui/themes';
import { Grid } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { getAllRequisitions  } from "@/redux/features/inventory";
import { toast } from "react-toastify";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import AddPurchaseOrderItemModal from "./create-purchase-order-dialog";
import CreatePurchaseOrderModal from "./modals/purchaseOrder/CreatePurchaseOrderModal";
import { CiSquareQuestion } from "react-icons/ci";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "r-items",
      label: "Requisition Items",
      icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
    },
  ];
  
  return actions;
};

const AddProductPurchase = () => {

  const pdfRef = useRef();
  const router = useRouter()
  const userActions = getActions();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { requisitions } = useSelector(({ inventory }) => inventory);
  const auth = useAuth();
  const [open, setOpen] = useState(false)
  const [selectedRowData, setSelectedRowData] = useState({})
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  useEffect(() => {
    if (auth.token) {
      dispatch(getAllRequisitions(auth));
    }
  }, [auth]);

  const onMenuClick = async (menu, data) => {
    if (menu.action === "r-items") {
      setSelectedRowData(data)
      setOpen(true)    
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

  const calculateTotalAmount = ({ data }) => {
    let amount = 0
    data.items.forEach((req)=>{
      if(data.procurement_approved){
        let price = parseInt(req.quantity_approved) * parseInt(req.buying_price)
        amount += price
      }else{
        let price = parseInt(req.quantity_requested) * parseInt(req.buying_price)
        amount += price
      }
    })
    return amount
  };

   /**
   * Gets datagrid row data
   * Checks if its procurement approved or not
   * if procurement approved, display a green circle
   * else orange circle
   */
   const showStatusColorCode = ({ data })=> {
    if(data.procurement_approved){
      return <div className="h-4 w-4 bg-success rounded-full"></div>
    }else{
      return <div className="h-4 w-4 bg-amber rounded-full"></div>
    }
  }

  return (
    <section ref={pdfRef}>
      <div className="flex gap-4 mb-8 items-center">
          <Link href='/dashboard/inventory/purchase-orders'><img className="h-3 w-3" src="/images/svgs/back_arrow.svg" alt="return to inventory"/></Link>
          <h3 className="text-xl"> Purchase Product </h3>
      </div>

      <DataGrid
        dataSource={requisitions.filter((requisition)=> (requisition.department_approved) && requisition.items.find((req)=> (!req.ordered) && (req.quantity_approved > 0)))}
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
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column
          dataField="requisition_number"
          caption="Requisition"
        />
        <Column
          dataField="department"
          caption="Department"
        />
        <Column 
          dataField="ordered_by"
          caption="Requested By" 
        />
        <Column dataField="date_created" caption="Requested Date" />
        <Column 
          dataField="total_items_requested" 
          caption="Items"
        />
        <Column 
          dataField="ordered_by"
          caption="Requested By" 
        />
        {/* <Column dataField="procurement_approval_date" caption="Approval Date" /> */}
        <Column 
          dataField="procurement_approved" 
          caption="Procurement Approved"
          cellRender={showStatusColorCode} 
        />
        <Column 
          dataField="items" 
          caption="Total Amount"
          cellRender={calculateTotalAmount} 
        />
        <Column
          dataField="" 
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {/* PO tracks if update is from this page or actual requisition page so as to update store accordingly */}
      {open && (<CreatePurchaseOrderModal open={open} setOpen={setOpen} selectedRowData={selectedRowData} setSelectedRowData={setSelectedRowData}/>)}
    </section>
  )
}

export default AddProductPurchase
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link'
import { Grid } from "@mui/material";
import { months } from "@/assets/dummy-data/laboratory";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllRequisitions, getAllSuppliers, getAllItems } from "@/redux/features/inventory";
import { getAllDoctors } from "@/redux/features/doctors";
import { getAllTheUsers } from "@/redux/features/users";
import { downloadPDF } from '@/redux/service/pdfs';
import { MdLocalPrintshop } from 'react-icons/md';
import { CiSquareQuestion } from "react-icons/ci";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ViewRequisitionItemsModal from "./modals/requisition/ViewRequisitionItemsModal";
import SearchOnlyFilter from "@/components/common/process/SearchOnly";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "print",
      label: "Print",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
    {
      action: "r-items",
      label: "Requisition Items",
      icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const RequisitionDatagrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const { requisitions } = useSelector(({ inventory }) => inventory);
  const usersData = useSelector((store)=>store.user.users);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({})
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

  const items = [
    {label: "None", value: ""},
    {label: "Requisition Number", value: "requisition_number"},
    {label: "Requested By First Name", value: "requested_by__first_name"},
    {label: "Requested By Last Name", value: "requested_by__last_name"},
    {label: "Department", value: "department__name"},
    {label: "Approved By First Name", value: "approved_by__first_name"},
    {label: "Approved By LAst Name", value: "approved_by__last_name"},
  ]

  const dispatch = useDispatch()
  const auth = useAuth();

  const onMenuClick = async (menu, data) => {
    if (menu.action === "r-items") {
      const updatedWithApprovedAsRequestedQuantity = data.items.map((item)=>{
        return({
          ...item,
          quantity_approved: item.quantity_requested
        })
      })
      setSelectedRowData({
        ...data,
        items: updatedWithApprovedAsRequestedQuantity
      });
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

  const handlePrint = async (data) => {
    try{
        const response = await downloadPDF(data.id, "_requisition_pdf", auth)
        window.open(response.url, '_blank');
        toast.success("got pdf successfully")

    }catch(error){
        console.log(error)
        toast.error(error)
    }
  };

  /**
   * Gets datagrid row data
   * Calculates the price depending on quantity approved or quantity requested
   * if is department approved, uses quantity approved
   * else uses quantity requested
  */
  const calculateTotalAmount = ({ data }) => {
    let amount = 0
    data.items.forEach((req)=>{
      if(data.department_approved){
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
   * Checks if its department approved or not
   * if department approved, display a green circle
   * else orange circle
   */
  const showStatusColorCode = ({ data })=> {
    if(data.department_approved){
      return <div className="h-4 w-4 bg-success rounded-full"></div>
    }else{
      return <div className="h-4 w-4 bg-amber rounded-full"></div>
    }
  }

  useEffect(() => {
    // This effect handles the debouncing logic
    const timerId = setTimeout(() => {
      // Dispatch the action only after a 500ms delay
      if(auth.token){
        dispatch(getAllRequisitions(auth, processFilter, selectedSearchFilter));
      }
    }, 500); // 500ms delay, adjust as needed

    // Cleanup function: clears the timer if searchTerm changes before the delay is over
    return () => {
      clearTimeout(timerId);
    };
  }, [auth, processFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-8"> Requisitions</h3>
        <div className="w-full flex items-center justify-end text-white">
          <Link className="mx-4 rounded-md p-2 bg-primary text-center" href='/dashboard/inventory/create-requisition'>
            Create Requisition
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
        dataSource={requisitions}
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
          dataField="approved_by"
          caption="Approved By" 
        />
        {/* <Column dataField="department_approval_date" caption="Department Approval Date" /> */}
        <Column 
          dataField="department_approved" 
          caption="Department Approved"
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
      {open && (
        <ViewRequisitionItemsModal 
          open={open} 
          setOpen={setOpen} 
          setSelectedRowData={setSelectedRowData} 
          selectedRowData={selectedRowData}
        />
      )}
    </section>
  );
};

export default RequisitionDatagrid;

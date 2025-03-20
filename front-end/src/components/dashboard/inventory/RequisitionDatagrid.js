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

  const dispatch = useDispatch()
  const auth = useAuth();

  const onMenuClick = async (menu, data) => {
    if (menu.action === "r-items") {
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

  const handlePrint = async (data) => {
    try{
        const response = await downloadPDF(data.id, "_requisition_pdf", auth)
        window.open(response.link, '_blank');
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
    if (auth.token) {
      dispatch(getAllRequisitions(auth));
      dispatch(getAllSuppliers(auth));
      dispatch(getAllItems(auth));
      dispatch(getAllDoctors(auth))
      dispatch(getAllTheUsers(auth))
    }
  }, [auth]);

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-8"> Requisitions</h3>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="w-full flex justify-between gap-8 rounded-lg">
            <select className="px-4 w-full py-2 border broder-gray rounded-lg focus:outline-none" name="" id="">
              <option value="" selected>                
              </option>
              {months.map((month, index) => (
                <option key={index} value="">
                  {month.name}
                </option>
              ))}
            </select>
        </Grid>
        <Grid className="w-full bg-white px-2 flex items-center rounded-lg" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search referrals by facility"
          />
        </Grid>
        <Grid className="w-full bg-primary rounded-md flex items-center text-white" item md={4} xs={4}>
          <Link className="mx-4 w-full text-center" href='/dashboard/inventory/create-requisition'>
            Create Requisition
          </Link>
        </Grid>
      </Grid>
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
          dataField="ordered_by"
          caption="Requested By" 
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

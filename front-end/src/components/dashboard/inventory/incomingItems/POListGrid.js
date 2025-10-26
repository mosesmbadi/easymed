import React, {useEffect, useState} from "react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { MdLocalPrintshop } from 'react-icons/md'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link'
import { Grid } from "@mui/material";
import { months } from "@/assets/dummy-data/laboratory";
import { getAllPurchaseOrders } from "@/redux/features/inventory";
import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllTheUsers } from "@/redux/features/users";
import { downloadPDF } from '@/redux/service/pdfs';
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ReceiveIncomingItems from "./ReceiveIncomingItems";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "po_items",
      label: "View PO items",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
    {
      action: "print",
      label: "Print",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const POListGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const { purchaseOrders } = useSelector(({ inventory }) => inventory);
  const usersData = useSelector((store)=>store.user.users);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [open, setOpen]=useState(false)
  const [selectedRowData, setSelectedRowData] = useState(null)

  const dispatch = useDispatch()
  const auth = useAuth();

  const handlePrint = async (data) => {
    try{
        const response = await downloadPDF(data.id, "_purchaseorder_pdf", auth)
        window.open(response.url, '_blank');
        toast.success("got pdf successfully")

    }catch(error){
        console.log(error)
        toast.error(error)
    }      
  };

  const onMenuClick = async (menu, data) => {
    if (menu.action === "po_items") {
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

  /**
   * Gets datagrid row data
   * Checks purchase order status
   * if completed, display a green circle
   * if partial, display a orange circle
   * else yellow circle
   */
  const showStatusColorCode = ({ data })=> {
    if(data.status === "COMPLETED"){
      return <div className="h-4 w-4 bg-success rounded-full"></div>
    } else if (data.status === "PARTIAL"){
      return <div className="h-4 w-4 bg-orange rounded-full"></div>
    } else {
      return <div className="h-4 w-4 bg-amber rounded-full"></div>
    }
  }

  useEffect(() => {
    if (auth.token) {
      dispatch(getAllPurchaseOrders(auth));
    }
  }, [auth]);

  return (
    <section className=" my-8">
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
      </Grid>
      <DataGrid
        dataSource={purchaseOrders.filter((po)=>po.total_items_ordered > 0 && po.is_dispatched && po.status !== 'COMPLETED')}
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
          dataField="PO_number"
          caption="Order Number" 
        />
        <Column 
          dataField="ordered_by"
          caption="Ordered By"
        />
        <Column 
          dataField="total_items_ordered"
          caption="Ordered Quantity"
        />
        <Column 
          dataField="status"
          caption="Received Status"
          cellRender={showStatusColorCode}
        />
        <Column dataField="date_created" caption="Requested Date" />
        <Column 
          dataField="" 
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {open && (<ReceiveIncomingItems open={open} setOpen={setOpen} selectedRowData={selectedRowData} setSelectedRowData={setSelectedRowData}/>)}
    </section>
  );
};

export default POListGrid;

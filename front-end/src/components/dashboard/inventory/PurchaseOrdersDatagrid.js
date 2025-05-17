import React, {useEffect, useState} from "react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { MdLocalPrintshop } from 'react-icons/md'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link'
import { Grid } from "@mui/material";
import { months } from "@/assets/dummy-data/laboratory";
import { getAllPurchaseOrders, getGoods } from "@/redux/features/inventory";
// import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
// import { getAllTheUsers } from "@/redux/features/users";
import { downloadPDF } from '@/redux/service/pdfs';
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ViewPurchaseOrderItemsModal from "./modals/purchaseOrder/ViewPurchaseOrderItems";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  return [
    {
      action: "po_items",
      label: "View PO items",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
    {
      action: "print_po",
      label: "Print PO",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
    {
      action: "print_grn",
      label: "Print GRN",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
  ];
};

const PurchaseOrdersDatagrid = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const userActions = getActions();
  const { purchaseOrders } = useSelector(({ inventory }) => inventory);
  const usersData = useSelector((store)=>store.user.users);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});

  const dispatch = useDispatch();
  const auth = useAuth();

  const handlePrintPO = async (data) => {
    if (isDownloading) return; 
    
    setIsDownloading(true);
    try {
      const response = await downloadPDF(data.id, "_purchaseorder_pdf", auth);
      const link = document.createElement('a');
      link.href = response.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PO:", error);
      toast.error(error.message || "Failed to download PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintGRN = async (data) => {
    if (!auth?.token) {
      console.error("Missing auth token");
      return;
    }
  
    if (!data?.id) {
      console.error("Missing data or data.id");
      return;
    }
  
    try {
      await dispatch(getGoods(data.id, auth));
      console.log("Goods receipt note fetched successfully.");
    } catch (error) {
      console.error("Error fetching GRN:", error);
    }
  };
  
  

  const onMenuClick = async (menu, data) => {
    switch (menu.action) {
      case "po_items":
        setSelectedRowData(data);
        setOpen(true);
        break;
      case "print_po":
        await handlePrintPO(data);
        break;
      case "print_grn":
        await handlePrintGRN(data);
        break;
      default:
        break;
    }
  };

  const actionsFunc = ({ data }) => (
    <CmtDropdownMenu
      sx={{ cursor: "pointer" }}
      items={userActions}
      onItemClick={(menu) => onMenuClick(menu, data)}
      TriggerComponent={
        <LuMoreHorizontal className="cursor-pointer text-xl" />
      }
    />
  );

  useEffect(() => {
    if (auth.token) {
      dispatch(getAllPurchaseOrders(auth));
    }
  }, [auth, dispatch]);

  const showStatusColorCode = ({ data }) => (
    <div className={`h-4 w-4 ${data.is_dispatched ? 'bg-success' : 'bg-amber'} rounded-full`}></div>
  );

  return (
    <section className="my-8">
      <h3 className="text-xl mb-8">Purchase Orders</h3>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="w-full flex justify-between gap-8 rounded-lg">
          <select className="px-4 w-full py-2 border broder-gray rounded-lg focus:outline-none">
            <option value="" selected></option>
            {months.map((month, index) => (
              <option key={index} value="">{month.name}</option>
            ))}
          </select>    
        </Grid>
        <Grid className="w-full bg-white px-2 flex items-center rounded-lg" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg' alt="search" />
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            placeholder="Search referrals by facility"
          />
        </Grid>
        <Grid className="w-full bg-primary rounded-md flex items-center text-white" item md={4} xs={4}>
          <Link className="mx-4 w-full text-center" href='/dashboard/inventory/add-purchase'>
            Create LPO
          </Link>
        </Grid>
      </Grid>
      
      <DataGrid
        dataSource={purchaseOrders}
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
        <Scrolling rowRenderingMode='virtual' />
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column dataField="PO_number" caption="Order Number" />
        <Column dataField="ordered_by" caption="Ordered By" />
        <Column dataField="total_items_ordered" caption="Ordered Quantity" />
        <Column dataField="is_dispatched" caption="Dispatched" cellRender={showStatusColorCode} />
        <Column dataField="date_created" caption="Requested Date" />
        <Column dataField="" caption="" cellRender={actionsFunc} />
      </DataGrid>

      {open && (
        <ViewPurchaseOrderItemsModal 
          open={open} 
          setOpen={setOpen} 
          selectedRowData={selectedRowData} 
          setSelectedRowData={setSelectedRowData}
        />
      )}
    </section>
  );
};

export default PurchaseOrdersDatagrid;
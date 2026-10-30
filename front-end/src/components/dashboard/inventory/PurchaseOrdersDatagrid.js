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
import SearchOnlyFilter from "@/components/common/process/SearchOnly";

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
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

  const items = [
    {label: "None", value: ""},
    {label: "PO Number", value: "PO_number"},
    {label: "Ordered By First Name", value: "ordered_by__first_name"},
    {label: "Ordered By Last Name", value: "ordered_by__last_name"},
    {label: "Approved By First Name", value: "approved_by__first_name"},
    {label: "Approved By Last Name", value: "approved_by__last_name"},
  ]

  const dispatch = useDispatch();
  const auth = useAuth();

  const handlePrintPO = async (data) => {
    try {
      const response = await downloadPDF(data.id, '_purchase_order_pdf', auth);
      window.open(response.url, '_blank');
      toast.success('PDF generated');
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrintGRN = async (data) => {
    try {
      const response = await downloadPDF(data.id, '_receipt_note_pdf', auth);
      window.open(response.url, '_blank');
      toast.success('PDF generated');
    } catch (e) {
      toast.error('Failed to generate PDF');
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

  // useEffect(() => {
  //   if (auth.token) {
  //     dispatch(getAllPurchaseOrders(auth));
  //   }
  // }, [auth, dispatch]);

    useEffect(() => {
      // This effect handles the debouncing logic
      const timerId = setTimeout(() => {
        // Dispatch the action only after a 500ms delay
        if(auth.token){
          dispatch(getAllPurchaseOrders(auth, processFilter, selectedSearchFilter));
        }
      }, 500); // 500ms delay, adjust as needed
  
      // Cleanup function: clears the timer if searchTerm changes before the delay is over
      return () => {
        clearTimeout(timerId);
      };
    }, [auth, processFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  const showStatusColorCode = ({ data }) => (
    <div className={`h-4 w-4 ${data.is_dispatched ? 'bg-success' : 'bg-amber'} rounded-full`}></div>
  );

  return (
    <section className="my-8">
      <h3 className="text-xl mb-8">Purchase Orders</h3>
      <div className="w-full flex items-center justify-end text-white">
        <Link className="mx-4 rounded-md p-2 bg-primary text-center" href='/dashboard/finance/accounts-payable/purchase-orders/new'>
          Create LPO
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
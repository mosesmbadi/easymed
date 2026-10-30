import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Column, Paging, Pager, Scrolling, Selection } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllInvoiceItemsByInvoiceId } from "@/redux/features/billing";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const ViewInvoiceItems = ({open, setOpen, selectedRowData}) => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const { invoiceItems } = useSelector((store)=> store.billing)

  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(()=> {
    dispatch(getAllInvoiceItemsByInvoiceId(auth, selectedRowData.id))
  }, [])

  const calculateCoPAy = ({ data }) => {
    return data.item_amount - data.actual_total
  };
  
  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle className="w-full bg-gray font-bold items-center justify-center flex">{`Invoice Number: ${selectedRowData.invoice_number}`}</DialogTitle>
      <DialogContent>
        <DataGrid
            dataSource={invoiceItems}
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
              dataField="item_code"
              caption="Code"
            />
            <Column
              dataField="item_name"
              caption="Item"
            />
            <Column
              dataField="quantity"
              caption="Qty"
              width={70}
            />
            <Column
              dataField="sale_price"
              caption="Unit Price"
            />
            <Column
              dataField="payment_mode_name"
              caption="Payment Mode"
            />
            <Column
              dataField="item_amount"
              caption="Total Amount"
            />
            <Column
              dataField=""
              caption="Co Pay"
              cellRender={calculateCoPAy}
            />
            <Column
              dataField="status"
              caption="Status"
            />
          </DataGrid>
      </DialogContent>
    </Dialog>
  )
}

export default ViewInvoiceItems
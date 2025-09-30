import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import { useAuth } from '@/assets/hooks/use-auth';
import { useDispatch, useSelector } from 'react-redux';
import { getAllIncomingItems } from '@/redux/features/inventory';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});
  
const allowedPageSizes = [5, 10, 'all'];

const ViewGrnItemsModal = ({ open, setOpen, selectedRowData }) => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const { incomingItems } = useSelector((store) => store.inventory);
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        // This effect handles the debouncing logic
        const timerId = setTimeout(() => {
            // Dispatch the action only after a 500ms delay
            if(auth.token){
                dispatch(getAllIncomingItems(auth, {goods_receipt_note: selectedRowData.id}));
            }
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [auth]);

    return (
        <section>
            
        <Dialog
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogContent>
            <DialogTitle>
                <div className='flex justify-between'>
                    <h2 className='text-lg font-bold'>{selectedRowData.requisition_number}</h2>
                </div>
            </DialogTitle>
            <DataGrid
                dataSource={incomingItems}
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
                <Column dataField="item_code" caption="Item Code"/>
                <Column dataField="item_name" caption="Product Name" />
                <Column dataField="category_one" caption="Category"/>
                <Column dataField="lot_no" caption="LOT NO"/>
                <Column dataField="supplier_name" caption="Supplier"/>
                <Column dataField="quantity" caption="Quantity"/>
                <Column dataField="purchase_price" caption="Purchase Price"/>
                <Column dataField="sale_price" caption="Sale price"  />
                <Column dataField="expiry_date" caption="Expiry DAte"/>
            </DataGrid>
            </DialogContent>
        </Dialog>
        </section>
    )
}

export default ViewGrnItemsModal
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { AiFillDelete } from "react-icons/ai";
import { CiSquareQuestion } from "react-icons/ci";
import EditRequisitionItemModal from '../requisition/EditRequisitionItemModal';
import { deleteRequisitionItem, updatePurchaseOrder, updateRequisition } from '@/redux/service/inventory';
import { useAuth } from '@/assets/hooks/use-auth';
import { useDispatch } from 'react-redux';
import { updatePOAfterDispatch } from '@/redux/features/inventory';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});
  
const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
    let actions = [
      {
        action: "edit",
        label: "Edit Item",
        icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
      },
      {
        action: "delete",
        label: "Delete",
        icon: <AiFillDelete className="text-warning text-xl mx-2" />,
      },
    ];
  
    return actions;
  };

const ViewPurchaseOrderItemsModal = ({ open, setOpen, selectedRowData, setSelectedRowData }) => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const userActions = getActions();
    const [editOpen, setEditOpen] = useState(false);
    const [selectedEditRowData, setSelectedEditRowData] = useState({})

    const handleClose = () => {
        setOpen(false);
    };

    const deleteReqItem = async (data) => {
        try{
            await deleteRequisitionItem(selectedRowData.id, data.id, auth)
            const deletedItemIndex = selectedRowData.items.findIndex((item)=> item.id === data.id)
            if(deletedItemIndex !== -1){
                const afterDelete = selectedRowData.items.filter((item) => item.id !== data.id);
                setSelectedRowData({ ...selectedRowData, items: afterDelete });
            }
        }catch(error){
            console.log("ERROR", error)
        }

    }

    const onMenuClick = async (menu, data) => {
        if (menu.action === "edit") {
          setSelectedEditRowData(data);
        //   setEditOpen(true);
        }else if(menu.action === "delete"){
            // deleteReqItem(data)
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


    const approveOrder = async() => {
        const payload = {
            is_dispatched: true
        }
        try{
            await updatePurchaseOrder(payload, selectedRowData.requisition, selectedRowData.id, auth)
            const updatedData = {...selectedRowData, is_dispatched: true}
            setSelectedRowData(updatedData)
            // handleClose()
            dispatch(updatePOAfterDispatch(updatedData))

        }catch(error){
            console.log("ERROR", error)
        }
    }


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
                    {!selectedRowData?.is_dispatched && (<div className='flex gap-5'>
                    <button onClick={()=>approveOrder()} className="bg-primary text-white text-sm rounded px-3 py-2"> dispatch</button>
                    </div>)}
                </div>
            </DialogTitle>
            <DataGrid
                dataSource={selectedRowData?.items}
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
                    caption="Item code"
                />
                <Column
                    dataField="item_name"
                    caption="Item name"
                />
                <Column dataField="preferred_supplier_name" caption="Preferred Supplier" />
                <Column 
                    dataField="quantity_at_hand"
                    caption="Re order Level" 
                />
                <Column 
                    dataField="quantity_at_hand"
                    caption="Quantity At Hand" 
                />
                <Column 
                    dataField="quantity_requested"
                    caption="Quantity Requested" 
                />
                <Column
                    dataField="quantity_approved"
                    caption="Quantity Approved" 
                />
                <Column 
                    dataField="buying_price"
                    caption="Buying Price" 
                />
                <Column 
                    dataField="selling_price"
                    caption="Selling Price" 
                />
                <Column 
                    calculateCellValue={(rowData) => !selectedRowData.department_approved ? rowData.quantity_requested * rowData.buying_price : rowData.quantity_approved * rowData.buying_price}
                    caption="Amount" 
                />
                {/* <Column 
                dataField="status"
                caption="Status"
                /> */}
                {!selectedRowData?.is_dispatched && (<Column
                    dataField="" 
                    caption=""
                    cellRender={actionsFunc}
                />)}
            </DataGrid>
            </DialogContent>
        </Dialog>
        <EditRequisitionItemModal setEditOpen={setEditOpen} editOpen={editOpen} requisition={selectedRowData} selectedEditRowData={selectedEditRowData} setSelectedRowData={setSelectedRowData}/>
        </section>
    )
}

export default ViewPurchaseOrderItemsModal
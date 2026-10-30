import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { AiFillDelete } from "react-icons/ai";
import { CiSquareQuestion } from "react-icons/ci";
import AddRequisitionItemModal from './AddRequisitionItemModal';
import EditRequisitionItemModal from './EditRequisitionItemModal';
import { deleteRequisitionItem, updateRequisition } from '@/redux/service/inventory';
import { updateRequisitionAfterPoGenerate } from '@/redux/features/inventory';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';

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

const ViewRequisitionItemsModal = ({ open, setOpen, selectedRowData, setSelectedRowData }) => {
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const userActions = getActions();
    const dispatch = useDispatch()
    const auth = useAuth();
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
          setEditOpen(true);
        }else if(menu.action === "delete"){
            deleteReqItem(data)
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


    const approveRequisition = async() => {
        const payload = {

            department_approved: true,
            status: 'completed'

        }
        try{
            await updateRequisition(payload, selectedRowData.id, auth)
            const updatedData = {...selectedRowData, department_approved: true, department_approval_date: new Date().toISOString()}
            setSelectedRowData(updatedData)
            // handleClose()
            dispatch(updateRequisitionAfterPoGenerate(updatedData))


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
                    {!selectedRowData?.department_approved && (<div className='flex gap-5'>
                    <button onClick={()=>approveRequisition()} className="bg-primary text-white text-sm rounded px-3 py-2"> Approve</button>
                    <AddRequisitionItemModal requisition={selectedRowData} setSelectedRowData={setSelectedRowData}/>
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
                    cellRender={({ data }) => `${data.quantity_at_hand ?? 0} ${data.base_unit ?? ''}`.trim()}
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
                    dataField="unit_label"
                    caption="Ordered In"
                    cellRender={({ data }) => (
                        data.conversion_factor > 1
                            ? `${data.unit_label} of ${data.conversion_factor} ${data.base_unit}`
                            : data.unit_label
                    )}
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
                {!selectedRowData?.department_approved && (<Column
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

export default ViewRequisitionItemsModal
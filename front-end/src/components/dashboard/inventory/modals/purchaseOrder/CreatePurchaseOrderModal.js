import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Column, Paging, Pager, Scrolling, Selection } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import themes from 'devextreme/ui/themes';
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { AiFillDelete } from "react-icons/ai";
import { CiSquareQuestion } from "react-icons/ci";
import { toast } from 'react-toastify';
import { addPurchaseOrder, deleteRequisitionItem, requisitionAction, updateRequisition } from '@/redux/service/inventory';
import EditRequisitionItemModal from '../requisition/EditRequisitionItemModal';
import { useAuth } from '@/assets/hooks/use-auth';
import { useDispatch } from 'react-redux';
import { getAllRequisitions, updateRequisitionAfterPoGenerate } from '@/redux/features/inventory';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

/** Pull something readable out of a DRF error body. */
const errorText = (err, fallback) => {
    const data = err?.response?.data;
    if (!data) return err?.message || fallback;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data[0];
    const [field, messages] = Object.entries(data)[0] ?? [];
    if (!field) return fallback;
    const detail = Array.isArray(messages) ? messages[0] : String(messages);
    return field === 'non_field_errors' ? detail : `${field}: ${detail}`;
};

const getActions = () => {
    let actions = [
        {
            action: "edit",
            label: "Edit Item",
            icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
        },
    ];

    return actions;
};

const CreatePurchaseOrderModal = ({ open, setOpen, selectedRowData, setSelectedRowData }) => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const userActions = getActions();
    const [editOpen, setEditOpen] = useState(false);
    const [selectedEditRowData, setSelectedEditRowData] = useState({})
    const [selectedItems, setSelectedItems] = useState(null)
    const [actionLoading, setActionLoading] = useState(null)
    const [allMode, setAllMode] = useState('allPages');
    const [checkBoxesMode, setCheckBoxesMode] = useState(
        themes.current().startsWith('material') ? 'always' : 'onClick',
    );

    const handleSelectionChanged = (selectedRowKeys) => {
        setSelectedItems(selectedRowKeys);
    };

    const handleClose = () => {
        setOpen(false);
    };

    console.log("FORM", auth)

    const onMenuClick = async (menu, data) => {
        if (menu.action === "edit") {
            setSelectedEditRowData(data);
            setEditOpen(true);
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


    const approveRequisition = async () => {
        // `status` is derived by the backend from this flag and the lines'
        // ordered state, so it is not ours to send.
        const payload = { procurement_approved: true }
        try {
            const response = await updateRequisition(payload, selectedRowData.id, auth)
            const updatedData = {
                ...selectedRowData,
                procurement_approved: true,
                status: response?.status ?? selectedRowData.status,
                status_display: response?.status_display ?? selectedRowData.status_display,
            }
            setSelectedRowData(updatedData)
            dispatch(updateRequisitionAfterPoGenerate(updatedData))
            toast.success("Requisition approved")

        } catch (error) {
            console.log("ERROR", error)
            toast.error(errorText(error, "Could not approve the requisition"))
        }
    }

    /**
     * Reject, cancel, or reopen. The server decides whether the transition is
     * allowed -- it refuses once lines have been ordered -- so its refusal is
     * what the user is shown.
     */
    const runRequisitionAction = async (action, prompt) => {
        let reason = ""
        if (action !== "reopen") {
            reason = window.prompt(prompt) ?? ""
            if (!reason.trim()) {
                toast.error("A reason is needed")
                return
            }
        }
        setActionLoading(action)
        try {
            const updated = await requisitionAction(action, selectedRowData.id, reason, auth)
            setSelectedRowData({ ...selectedRowData, ...updated })
            dispatch(getAllRequisitions(auth))
            toast.success(`Requisition ${updated.status_display?.toLowerCase() ?? action}`)
            if (action !== "reopen") {
                handleClose()
            }
        } catch (error) {
            toast.error(errorText(error, `Could not ${action} the requisition`))
        }
        setActionLoading(null)
    }

    const generatePurchaseOrder = async () => {
        // Extract requisition IDs from selected items
        const req_ids = selectedItems?.selectedRowKeys.map((req_item) => req_item.id);

        const payload = {
            "requisition_items": req_ids,
            "ordered_by": parseInt(auth.user_id),
            "supplier": selectedItems?.selectedRowKeys[0].preferred_supplier,
            "created_by": auth.user_id
        };

        try {
            // Call the API to add the purchase order
            const response = await addPurchaseOrder(payload, selectedRowData.id, auth);

            let newData = []

            // Update the `ordered` field to `true` for each selected item
            const updatedRowKeys = selectedRowData?.items.map((req_item) => {
                const foundItem = req_ids.find((item) => item === req_item.id)
                if (foundItem) {
                    const updated_req_item = {
                        ...req_item,
                        ordered: true,
                    }
                    newData.push(updated_req_item)

                } else {
                    newData.push(req_item)
                }
            });

            let newRowData = {
                ...selectedRowData,
                items: newData
            }

            //update state of items in row
            setSelectedRowData(newRowData)
            // update requisition in store
            dispatch(updateRequisitionAfterPoGenerate(newRowData))
            // close modal if all have been po created
            // check for un approved items
            const unApproved = newRowData.items.find((item) => (!item.ordered) && (item.quantity_approved > 0))
            console.log("AGEEE", unApproved)
            if (!unApproved) {
                handleClose()
            }
            // Ordering these lines moves the requisition's status on the
            // server, so take the new value from there rather than guessing.
            dispatch(getAllRequisitions(auth))
            toast.success("Purchase order generated")

        } catch (error) {
            console.error("ERROR", error);
            toast.error(errorText(error, "Could not generate the purchase order"));
        }
    };



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
                        <div className='flex justify-between items-start'>
                            <div>
                                <h2 className='text-lg font-bold'>{selectedRowData?.requisition_number}</h2>
                                {selectedRowData?.is_closed && (
                                    <p className='text-sm text-warning font-normal mt-1'>
                                        {selectedRowData.status_display}
                                        {selectedRowData.closed_by ? ` by ${selectedRowData.closed_by}` : ''}
                                        {selectedRowData.closed_reason ? ` — ${selectedRowData.closed_reason}` : ''}
                                    </p>
                                )}
                            </div>

                            <div className='flex gap-3'>
                                {selectedRowData?.is_closed ? (
                                    <button
                                        onClick={() => runRequisitionAction("reopen")}
                                        disabled={actionLoading === "reopen"}
                                        className="border border-primary text-primary text-sm rounded px-3 py-2">
                                        {actionLoading === "reopen" ? "Reopening..." : "Reopen"}
                                    </button>
                                ) : (
                                    <>
                                        {!selectedRowData?.procurement_approved && (<button onClick={() => approveRequisition()} className="bg-primary text-white text-sm rounded px-3 py-2"> Approve</button>)}
                                        {(selectedRowData?.procurement_approved) && (selectedItems?.selectedRowKeys.length > 0) && (<button onClick={() => generatePurchaseOrder()} className="bg-primary text-white text-sm rounded px-3 py-2">Generate PO</button>)}
                                        <button
                                            onClick={() => runRequisitionAction("reject", "Why is this requisition being rejected?")}
                                            disabled={actionLoading === "reject"}
                                            className="border border-warning text-warning text-sm rounded px-3 py-2">
                                            {actionLoading === "reject" ? "Rejecting..." : "Reject"}
                                        </button>
                                        <button
                                            onClick={() => runRequisitionAction("cancel", "Why is this requisition being cancelled?")}
                                            disabled={actionLoading === "cancel"}
                                            className="border border-gray text-sm rounded px-3 py-2">
                                            {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </DialogTitle>
                    <DataGrid
                        dataSource={selectedRowData?.procurement_approved ? selectedRowData?.items.filter((item) => (item.quantity_approved > 0) && !item.ordered) : selectedRowData?.items.filter((req) => !req.ordered)}
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
                        onSelectionChanged={handleSelectionChanged}
                    >
                        {selectedRowData?.procurement_approved && (<Selection
                            mode="multiple"
                            selectAllMode={allMode}
                            showCheckBoxesMode={checkBoxesMode}
                        />)}
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
                            calculateCellValue={(rowData) => !selectedRowData.procurement_approved ? rowData.quantity_requested * rowData.buying_price : rowData.quantity_approved * rowData.buying_price}
                            caption="Amount"
                        />
                        {/* <Column 
                dataField="status"
                caption="Status"
                /> */}
                        {!selectedRowData?.procurement_approved && (<Column
                            dataField=""
                            caption=""
                            cellRender={actionsFunc}
                        />)}
                    </DataGrid>
                </DialogContent>
            </Dialog>
            <EditRequisitionItemModal setEditOpen={setEditOpen} editOpen={editOpen} requisition={selectedRowData} selectedEditRowData={selectedEditRowData} setSelectedRowData={setSelectedRowData} />
        </section>
    )
}

export default CreatePurchaseOrderModal
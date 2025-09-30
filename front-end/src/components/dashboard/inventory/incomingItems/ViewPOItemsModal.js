import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Column, Paging, Pager, Scrolling, Selection } from "devextreme-react/data-grid";
import dynamic from "next/dynamic";
import themes from 'devextreme/ui/themes';
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { AiFillDelete } from "react-icons/ai";
import { CiSquareQuestion } from "react-icons/ci";
import UpdateReceivedItemModal from './UpdateReceivedItemModal';
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
        label: "Receive Item",
        icon: <CiSquareQuestion className="text-success text-xl mx-2" />,
      }
    ];
  
    return actions;
  };

const ViewPOItemsModal = ({ values, selectedRowData, setSelectedRowData, setSelectedItems, createdIncomings }) => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const userActions = getActions();
    const [editOpen, setEditOpen] = useState(false);
    const [selectedEditRowData, setSelectedEditRowData] = useState({})
    const [allMode, setAllMode] = useState('allPages');
    // const [checkBoxesMode, setCheckBoxesMode] = useState(
    //     themes.current().startsWith('material') ? 'always' : 'onClick',
    // );

    const handleSelectionChanged = (selectedRowKeys) => {
        let totalAmounts = 0;
        setSelectedItems(selectedRowKeys);
        if(selectedRowKeys.selectedRowsData.length > 0){
            selectedRowKeys.selectedRowsData.forEach((selected)=>{
                totalAmounts = totalAmounts + (parseInt(selected.quantity_received) * parseInt(selected.buying_price))
                values.amount = totalAmounts
            })
        }else{
            values.amount = 0;
        }
    };

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

     const renderLotNumber = ({ data }) => {
        const relatedItem = createdIncomings.find((incoming)=> incoming.item === data.item)
        if(relatedItem){
            return relatedItem.lot_no
        }
     }

     const renderExpiryDate = ( {data} ) => {
        const relatedItem = createdIncomings.find((incoming)=> incoming.item === data.item)
        if(relatedItem){
            return relatedItem.expiry_date
        }
     }

     const renderCategory = ( {data} ) => {
        const relatedItem = createdIncomings.find((incoming)=> incoming.item === data.item)
        if(relatedItem){
            return relatedItem.category_one
        }
      }

    return (
        <section>

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
            onSelectionChanged={handleSelectionChanged}
        >
            <Selection
                mode="multiple"
                selectAllMode={allMode}
                // showCheckBoxesMode={checkBoxesMode}
            />
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
            { createdIncomings.length <= 0 && (
                    <Column 
                        dataField="category_one"
                        caption="Category"
                    />
            )}
            { createdIncomings.length <= 0 && (
                    <Column 
                        dataField="expiry_date"
                        caption="Expiry Date"
                    />
            )}
            { createdIncomings.length <= 0 && (
                    <Column 
                        dataField="lot_no"
                        caption="LOT No"
                    />
            )}
            { createdIncomings.length > 0 && (
                    <Column 
                        dataField="category_one"
                        caption="Category"
                        cellRender={renderCategory}
                    />
            )}
            { createdIncomings.length > 0 && (
                    <Column 
                        dataField="expiry_date"
                        caption="Expiry Date"
                        cellRender={renderExpiryDate}
                    />
            )}
            { createdIncomings.length > 0 && (
                    <Column 
                        dataField="lot_no"
                        caption="LOT No"
                        cellRender={renderLotNumber}
                    />
            )}
            <Column
                dataField="quantity_approved"
                caption="Quantity Approved" 
            />
            <Column 
                dataField="quantity_received"
                caption="Quantity Received" 
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
                calculateCellValue={(rowData) => rowData.quantity_received ? rowData.quantity_received * rowData.buying_price : rowData.quantity_approved * rowData.buying_price}
                caption="Amount" 
            />
            {/* <Column 
            dataField="status"
            caption="Status"
            /> */}
            <Column
                dataField="" 
                caption=""
                cellRender={actionsFunc}
            />
        </DataGrid>
        <UpdateReceivedItemModal 
            editOpen={editOpen} setEditOpen={setEditOpen} selectedEditRowData={selectedEditRowData} 
            setSelectedEditRowData={setSelectedEditRowData}
            po={selectedRowData} setSelectedRowData={setSelectedRowData}
            createdIncomings={createdIncomings}

        />
        </section>
    )
}

export default ViewPOItemsModal
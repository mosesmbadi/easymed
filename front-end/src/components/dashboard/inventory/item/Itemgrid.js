import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux';
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth';
import { getAllIncomingItems, getItems } from '@/redux/features/inventory';
import { months } from "@/assets/dummy-data/laboratory";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { BiEdit } from 'react-icons/bi';
import EditItemModal from './EditItemModal';


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Edit Item",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const ItemsGrid = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();
  const { item } = useSelector((store) => store.inventory);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [editOpen, setEditOpen] = useState(false)
  const [selectedRowData, setSelectedRowData] = useState({})

  const SearchedItems = item.filter((item)=> item.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(()=>{
    if (auth.token){
      dispatch(getItems(auth))
    }

  }, [auth])

  const onMenuClick = async (menu, data) => {
    if (menu.action === "update"){
      setSelectedRowData(data);
      setEditOpen(true);      
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
      </>
    );
  };

  return (
    <section className=" my-8">
      <h3 className="text-xl mt-8"> Items </h3>
      
      <DataGrid
        dataSource={SearchedItems}
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
        <Column dataField="name" caption="Name"/>
        <Column
          dataField="category"
          caption="Category"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="units_of_measure" caption="Unit"/>
        <Column dataField="desc" caption="Description"/>
        <Column
          dataField=""
          caption=""
          width={50}
          cellRender={actionsFunc}
        />
      </DataGrid>
      {editOpen && (
        <EditItemModal 
          open={editOpen} 
          setOpen={setEditOpen} 
          selectedRowData={selectedRowData}  
        />
      )}
    </section>

  )
}

export default ItemsGrid
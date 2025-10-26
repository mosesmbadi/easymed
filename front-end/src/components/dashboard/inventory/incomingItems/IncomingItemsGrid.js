import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux';
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth';
import { getAllIncomingItems, getItems } from '@/redux/features/inventory';
import { months } from "@/assets/dummy-data/laboratory";
import SearchOnlyFilter from '@/components/common/process/SearchOnly';


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const IncomingItemsGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const dispatch = useDispatch();
  const auth = useAuth();
  const { incomingItems, item } = useSelector((store) => store.inventory);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

  const items = [
    {label: "None", value: ""},
    {label: "Product Name", value: "item__name"},
    {label: "Item Code", value: "item__item_code"},
    {label: "LOT NO", value: "lot_no"},
    {label: "Supplier", value: "supplier__name"},
  ]

  useEffect(() => {
    // This effect handles the debouncing logic
    const timerId = setTimeout(() => {
      // Dispatch the action only after a 500ms delay
      if(auth.token){
        dispatch(getAllIncomingItems(auth, {}, processFilter, selectedSearchFilter));
      }
    }, 500); // 500ms delay, adjust as needed

    // Cleanup function: clears the timer if searchTerm changes before the delay is over
    return () => {
      clearTimeout(timerId);
    };
  }, [auth, processFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section className=" my-8">
  <div className="w-full flex items-center justify-end text-white mt-4">
  <Link className="mx-4 rounded-md p-2 bg-primary text-center" href="/dashboard/finance/accounts-payable/receive-items/new">
          Add Received Item
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
    </section>

  )
}

export default IncomingItemsGrid
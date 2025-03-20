import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux';
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";

import { useAuth } from '@/assets/hooks/use-auth';
import { getAllIncomingItems, getItems } from '@/redux/features/inventory';
import { months } from "@/assets/dummy-data/laboratory";


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

  useEffect(()=>{
    if (auth.token){
      dispatch(getAllIncomingItems(auth));
      dispatch(getItems(auth))
    }

  }, [auth])

  return (
    <section className=" my-8">
      <h3 className="text-xl mt-8"> Incoming Items </h3>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="w-full flex justify-between gap-8 rounded-lg">
            <select className="px-4 w-full py-2 border broder-gray rounded-lg focus:outline-none" name="" id="">
              <option value="" selected>                
              </option>
              {months.map((month, index) => (
                <option key={index} value="">
                  {month.name}
                </option>
              ))}
            </select>
        </Grid>
        <Grid className="w-full bg-white px-2 flex items-center rounded-lg" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search referrals by facility"
          />
        </Grid>
        <Grid className="w-full bg-primary rounded-md flex items-center text-white" item md={4} xs={4}>
          <Link className="mx-4 w-full text-center" href="/dashboard/inventory/incoming-items/new">
            add New Item
          </Link>
        </Grid>
      </Grid>
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
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux"; 
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link';
import { Grid } from "@mui/material";
import { months } from "@/assets/dummy-data/laboratory";
import { InventoryDisplayStats } from "@/assets/menu";
import { InventoryInfoCardsItem } from "@/components/dashboard/inventory/inventory-info-cards-item";
import { getAllInventories, getAllPurchaseOrders } from "@/redux/features/inventory";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllInvoiceItems } from "@/redux/features/billing";
import { getAllTheDepartments } from "@/redux/features/auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const InventoryDataGrid = ({department}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { inventories } = useSelector((store) => store.inventory);
  const dispatch = useDispatch()
  const auth = useAuth();
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const { departments } = useSelector(({ auth }) => auth);
  const [selectedDepartment, setSelectedDepartment]= useState(department)

  const filteredInventories = inventories.filter((inventory)=> inventory.item_name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    if (auth.token) {
      dispatch(selectedDepartment !== "All" ? getAllInventories(auth, selectedDepartment, "") : getAllInventories(auth, department, ""));
      dispatch(getAllTheDepartments(auth));
      // dispatch(getAllInvoiceItems(auth));
      // dispatch(getAllPurchaseOrders(auth));
    }
  }, [auth, selectedDepartment, department]);

  const inventorySummaryInfo = InventoryDisplayStats().map((item, index) => <InventoryInfoCardsItem key={`inventory-display-info ${index}`} itemData={item}/>)

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-2"> Sales Summary </h3>
      <Grid container spacing={2}>
        {inventorySummaryInfo}      
      </Grid>
      <h3 className="text-xl mt-8"> Inventory </h3>
      <Grid className="my-2 flex flex-col justify-between gap-4">
      {!department && (
          <Grid className="flex items-center w-full" item md={12} xs={12}>
            {[{"id": 0, "name": "All"}, ...departments].map((department)=><p className="rounded-md py-1 px-2 bg-primary mx-2 cursor-pointer text-white" key={department.id} onClick={()=>setSelectedDepartment(department.name)}>{department.name}</p>)}
          </Grid>
        )}
        <Grid className="flex items-center rounded-lg bg-white px-2 w-full" item md={12} xs={12}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search referrals by facility"
          />
        </Grid>
        {/* <Grid className="bg-primary rounded-md flex items-center text-white w-full" item md={4} xs={4}>
          <Link className="mx-4 w-full text-center" href='/dashboard/inventory/add-inventory'>
            Add Inventory
          </Link>
        </Grid> */}

      </Grid>
      <DataGrid
        dataSource={filteredInventories}
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
        <Column dataField="item_name"  caption="Product Name" />
        <Column dataField="purchase_price" caption="Purchase Price"/>
        <Column
          dataField="sale_price"
          caption="Sale price"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="lot_number" caption="Lot No" />
        <Column dataField="department_name" caption="Department"/>
        <Column dataField="quantity_at_hand" caption="Lot Quantity"/>
        <Column dataField="total_quantity" caption="Total Quantity"/>
        <Column dataField="category_one" caption="Category"/>
        <Column dataField="expiry_date" caption="Expiry Date"/>
      </DataGrid>
    </section>
  );
};

export default InventoryDataGrid;
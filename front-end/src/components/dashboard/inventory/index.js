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

const InventoryDataGrid = ({ department }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { inventories } = useSelector((store) => store.inventory);
  const dispatch = useDispatch()
  const auth = useAuth();
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const { departments } = useSelector(({ auth }) => auth);
  const [selectedDepartment, setSelectedDepartment] = useState(department)

  const filteredInventories = inventories.filter((inventory) => inventory.item_name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    if (auth.token) {
      dispatch(selectedDepartment !== "All" ? getAllInventories(auth, selectedDepartment, "") : getAllInventories(auth, department, ""));
      dispatch(getAllTheDepartments(auth));
      // dispatch(getAllInvoiceItems(auth));
      // dispatch(getAllPurchaseOrders(auth));
    }
  }, [auth, selectedDepartment, department]);

  const inventorySummaryInfo = InventoryDisplayStats().map((item, index) => <InventoryInfoCardsItem key={`inventory-display-info ${index}`} itemData={item} />)

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-2"> Sales Summary </h3>
      <Grid container spacing={2} className="flex flex-wrap items-center justify-between my-4">
        {/* Department Filter */}
        {!department && (
          <Grid item className="flex flex-wrap items-center gap-2">
            {[{ id: 0, name: "All" }, ...departments].map((dept) => (
              <p
                key={dept.id}
                className="rounded-md py-1 px-2 bg-primary text-white cursor-pointer text-sm"
                onClick={() => setSelectedDepartment(dept.name)}
              >
                {dept.name}
              </p>
            ))}
          </Grid>
        )}

        {/* Search Bar */}
        <Grid item className="flex items-center bg-white rounded-lg px-2 py-1 w-full sm:w-1/3">
          <img className="h-4 w-4" src='/images/svgs/search.svg' />
          <input
            className="px-2 py-1 bg-transparent rounded-lg focus:outline-none text-xs w-full"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            placeholder="Search referrals by facility"
          />
        </Grid>

        {/* Add Inventory Button */}
        <Grid item>
          <Link href="/dashboard/inventory/add-inventory">
            <div className="bg-primary text-white rounded-md px-4 py-2 text-sm cursor-pointer">
              Add Inventory
            </div>
          </Link>
        </Grid>
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
        <Column dataField="item_name" caption="Product Name" />
        <Column dataField="purchase_price" caption="Purchase Price" />
        <Column
          dataField="sale_price"
          caption="Sale price"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="lot_number" caption="Lot No" />
        <Column dataField="department_name" caption="Department" />
        <Column dataField="quantity_at_hand" caption="Lot Quantity" />
        <Column dataField="total_quantity" caption="Total Quantity" />
        <Column dataField="category_one" caption="Category" />
        <Column dataField="expiry_date" caption="Expiry Date" />
      </DataGrid>
    </section>
  );
};

export default InventoryDataGrid;
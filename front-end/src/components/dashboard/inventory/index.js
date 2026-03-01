import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { months } from "@/assets/dummy-data/laboratory";
import { InventoryDisplayStats } from "@/assets/menu";
import { InventoryInfoCardsItem } from "@/components/dashboard/inventory/inventory-info-cards-item";
import { getAllInventories, getAllPurchaseOrders } from "@/redux/features/inventory";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllInvoiceItems } from "@/redux/features/billing";
import { getAllTheDepartments } from "@/redux/features/auth";
import SearchOnlyFilter from "@/components/common/process/SearchOnly";

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
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({ label: "", value: "" })

  const items = [
    { label: "None", value: "" },
    { label: "Lot Number", value: "lot_number" },
    { label: "Item Name", value: "item__name" },
    { label: "Item Code", value: "item__item_code" },
    { label: "Department Name", value: "department__name" },
  ]

  const filteredInventories = inventories.filter((inventory) => inventory.item_name.toLowerCase().includes(searchQuery.toLowerCase()))

  const metrics = useMemo(() => {
    let shortExpiries = 0;
    let reorderLevels = 0;
    let totalValue = 0;

    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    filteredInventories.forEach((inventory) => {
      // Calculate short expiries
      if (inventory.expiry_date) {
        const expiryDate = new Date(inventory.expiry_date);
        if (expiryDate > today && expiryDate <= ninetyDaysFromNow) {
          shortExpiries += 1;
        }
      }

      // Calculate reorder levels
      const reOrderLevel = inventory.re_order_level || 5; // Default 5 if missing from old API
      const quantity = parseInt(inventory.quantity_at_hand) || 0;
      if (quantity <= reOrderLevel) {
        reorderLevels += 1;
      }

      // Calculate total value
      const price = parseFloat(inventory.purchase_price) || 0;
      totalValue += price * quantity;
    });

    return { shortExpiries, reorderLevels, totalValue };
  }, [filteredInventories]);

  const MetricCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 1 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{
            backgroundColor: `${color}.light`,
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon, { fontSize: 'small' })}
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" fontWeight="bold" color={`${color}.main`}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  useEffect(() => {
    if (auth.token) {
      // dispatch(selectedDepartment !== "All" ? getAllInventories(auth, selectedDepartment, "") : getAllInventories(auth, department, ""));
      dispatch(getAllTheDepartments(auth));
      // dispatch(getAllInvoiceItems(auth));
      // dispatch(getAllPurchaseOrders(auth));
    }
  }, [auth, selectedDepartment, department]);

  useEffect(() => {
    // This effect handles the debouncing logic
    const timerId = setTimeout(() => {
      // Dispatch the action only after a 500ms delay
      if (auth.token) {
        const depat = selectedDepartment !== "All" ? selectedDepartment : department
        dispatch(getAllInventories(auth, depat, "", processFilter, selectedSearchFilter));
        dispatch(getAllTheDepartments(auth));
      }
    }, 500); // 500ms delay, adjust as needed

    // Cleanup function: clears the timer if searchTerm changes before the delay is over
    return () => {
      clearTimeout(timerId);
    };
  }, [processFilter.search, selectedDepartment, department]); // The effect re-runs only when the local `searchTerm` state changes

  const calculateLotValue = ({ data }) => {
    return parseInt(data.purchase_price) * parseInt(data.quantity_at_hand)
  };

  const inventorySummaryInfo = InventoryDisplayStats().map((item, index) => <InventoryInfoCardsItem key={`inventory-display-info ${index}`} itemData={item} />)

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-2"> Sales Summary </h3>

      <Grid container spacing={2} justifyContent="flex-start" sx={{ mb: 3, mt: 1 }}>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Short Expiries"
            value={metrics.shortExpiries}
            icon={<WarningIcon sx={{ color: 'warning.main' }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Re-order Levels"
            value={metrics.reorderLevels}
            icon={<InventoryIcon sx={{ color: 'error.main' }} />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Total Value"
            value={`Ksh ${metrics.totalValue.toLocaleString()}`}
            icon={<AttachMoneyIcon sx={{ color: 'success.main' }} />}
            color="success"
          />
        </Grid>
      </Grid>

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

        {/* Add Inventory Button */}
        <Grid item>
          <Link href="/dashboard/inventory/add-inventory">
            <div className="bg-primary text-white rounded-md px-4 py-2 text-sm cursor-pointer">
              Add Inventory
            </div>
          </Link>
        </Grid>
      </Grid>
      <SearchOnlyFilter
        selectedFilter={processFilter}
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter}
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />

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
        <Column dataField="item_code" caption="Product Code" />
        <Column dataField="item_name" caption="Product Name" />
        <Column dataField="category_one" caption="Category" />
        <Column dataField="department_name" caption="Department" />
        <Column dataField="lot_number" caption="Lot No" />
        <Column dataField="expiry_date" caption="Expiry Date" />
        <Column dataField="purchase_price" caption="Purchase Price" />
        <Column
          dataField="sale_price"
          caption="Sale price"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="quantity_at_hand" caption="Lot Quantity" />
        <Column dataField="total_quantity" caption="Total Quantity" />
        <Column dataField="" caption="Total Amount" cellRender={calculateLotValue} />
      </DataGrid>
    </section>
  );
};

export default InventoryDataGrid;
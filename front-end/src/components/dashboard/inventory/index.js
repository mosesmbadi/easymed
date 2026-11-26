import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import Link from 'next/link';
import { useRouter } from 'next/router';
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
import { formatPackQuantity, formatPackPricing } from "@/functions/inventory";
import { getAllInventories, getAllPurchaseOrders, addItemToInventoryList } from "@/redux/features/inventory";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllInvoiceItems } from "@/redux/features/billing";
import { getAllTheDepartments } from "@/redux/features/auth";
import SearchOnlyFilter from "@/components/common/process/SearchOnly";
import ForceDeleteDialog from "@/components/common/ForceDeleteDialog";
import { isAdmin } from "@/utils/permissions";
import { toast } from "react-toastify";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const CardButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${active ? 'bg-primary text-white' : 'bg-light text-primary'} rounded px-2 py-1 text-xs`}
  >
    {children}
  </button>
);

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Re-order is set per item per department, so compare it with the stock across
// all that item's lots there, not with one lot.
const onHand = (inventory) =>
  parseInt(inventory.total_quantity ?? inventory.quantity_at_hand) || 0;

const InventoryDataGrid = ({ department }) => {
  const router = useRouter();
  // Which card's list the grid shows: null (all stock), 'short_expiry' or 'reorder'.
  const [cardView, setCardView] = useState(null);
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const items = [
    { label: "None", value: "" },
    { label: "Lot Number", value: "lot_number" },
    { label: "Item Name", value: "item__name" },
    { label: "Item Code", value: "item__item_code" },
    { label: "Department Name", value: "department__name" },
  ]

  // Searching is done server-side via processFilter; these are the rows the
  // API already narrowed for us.
  const filteredInventories = inventories

  const metrics = useMemo(() => {
    const shortExpiryRows = [];
    const reorderRows = [];
    const reorderSeen = new Set();
    let totalValue = 0;

    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    filteredInventories.forEach((inventory) => {
      // Calculate short expiries
      if (inventory.expiry_date) {
        const expiryDate = new Date(inventory.expiry_date);
        if (expiryDate > today && expiryDate <= ninetyDaysFromNow) {
          shortExpiryRows.push(inventory);
        }
      }

      // Calculate reorder levels. `?? 5` rather than `|| 5` so a legitimate
      // re-order level of 0 is not silently treated as 5.
      const reOrderLevel = inventory.re_order_level ?? 5;
      const quantity = parseInt(inventory.quantity_at_hand) || 0;
      // One row per item and department, however many lots it has.
      const reorderKey = `${inventory.item}-${inventory.department}`;
      if (onHand(inventory) <= reOrderLevel && !reorderSeen.has(reorderKey)) {
        reorderSeen.add(reorderKey);
        reorderRows.push(inventory);
      }

      // Cost of what is on the shelf, at the backend's precision where it
      // gave us a figure.
      totalValue +=
        inventory.lot_value ?? (parseFloat(inventory.purchase_price) || 0) * quantity;
    });

    return {
      shortExpiryRows,
      reorderRows,
      shortExpiries: shortExpiryRows.length,
      reorderLevels: reorderRows.length,
      totalValue,
      totalItems: filteredInventories.length,
    };
  }, [filteredInventories]);

  const gridRows =
    cardView === 'short_expiry' ? metrics.shortExpiryRows
      : cardView === 'reorder' ? metrics.reorderRows
        : filteredInventories;

  const toggleCardView = (view) => setCardView((current) => (current === view ? null : view));

  const printShortExpiries = () => {
    const rows = [...metrics.shortExpiryRows].sort(
      (a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    const body = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.item_code)}</td>
        <td>${escapeHtml(row.item_name)}</td>
        <td>${escapeHtml(row.department_name)}</td>
        <td>${escapeHtml(row.lot_number)}</td>
        <td>${escapeHtml(row.expiry_date)}</td>
        <td>${escapeHtml(formatPackQuantity(row, row.quantity_at_hand))}</td>
      </tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups to print the list.');
      return;
    }
    win.document.write(`<!doctype html><html><head><title>Short Expiries</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; margin: 24px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
        th { background: #eee; }
      </style></head><body>
      <h2>Short Expiries (next 90 days)</h2>
      <p>Printed ${escapeHtml(new Date().toLocaleString())} · ${rows.length} lot${rows.length !== 1 ? 's' : ''}</p>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Lot No</th><th>Expiry Date</th><th>Quantity</th></tr></thead>
        <tbody>${body || '<tr><td colspan="6">No lots expire in the next 90 days.</td></tr>'}</tbody>
      </table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // Put every item at or below its re-order level on the requisition form.
  // The suggested quantity tops stock up to twice the re-order level; it and
  // the supplier are set on the form before saving.
  const requisitionReorderItems = () => {
    if (metrics.reorderRows.length === 0) {
      toast.info('No items are at their re-order level.');
      return;
    }
    const byItem = new Map();
    metrics.reorderRows.forEach((row) => {
      const level = row.re_order_level ?? 5;
      const suggested = Math.max(level * 2 - onHand(row), 1);
      byItem.set(row.item, Math.max(byItem.get(row.item) ?? 0, suggested));
    });
    byItem.forEach((quantity, item) => {
      dispatch(addItemToInventoryList({
        item,
        preferred_supplier: null,
        quantity_requested: String(quantity),
        item_unit: null,
      }));
    });
    router.push('/dashboard/inventory/create-requisition');
  };

  const MetricCard = ({ title, value, icon, color, subtitle, smallValue, actions }) => (
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
            <Typography variant={smallValue ? "h6" : "h5"} fontWeight="bold" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
              {title}
            </Typography>
          </Box>
        </Stack>
        {actions && (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {actions}
          </Stack>
        )}
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

  // The backend already works this out at full decimal precision as lot_value;
  // recomputing it here with parseInt threw away the cost's decimals.
  const renderLotValue = ({ data }) => {
    const value =
      data.lot_value ??
      (parseFloat(data.purchase_price) || 0) * (parseInt(data.quantity_at_hand) || 0);
    return `Ksh ${money(value)}`;
  };

  const renderPackQuantity = ({ data }) => {
    return formatPackQuantity(data, data.quantity_at_hand);
  };

  const renderTotalPackQuantity = ({ data }) => {
    return formatPackQuantity(data, data.total_quantity);
  };

  const renderPurchasePrice = ({ data }) => {
    return `Ksh ${money(data.purchase_price)}`;
  };

  const renderPackaging = ({ data }) => {
    // Raw materials carry no sale price at all -- the lab prices the Test
    // Panel built from them -- so say that rather than printing Ksh 0.
    if (data.sale_price == null) {
      return <span className="text-gray text-xs">Not sold as stock</span>;
    }
    const rows = formatPackPricing(data, data.sale_price);
    return (
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <span key={row.label} className="text-xs">
            1 {row.label}
            {row.factor > 1 ? ` (${row.factor} ${data.units_of_measure || 'units'})` : ''}
            {row.isDerived ? ' ≈ ' : ' = '}Ksh {money(row.price)}
            {row.isDerived && <span className="text-gray"> at unit rate</span>}
            {row.isDefault && <span className="text-primary"> · sells in</span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <section className=" my-8">
      <h3 className="text-xl mb-2"> Stock on Hand </h3>

      <Grid container spacing={2} justifyContent="flex-start" sx={{ mb: 3, mt: 1 }}>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Short Expiries"
            value={metrics.shortExpiries}
            icon={<WarningIcon sx={{ color: 'warning.main' }} />}
            color="warning"
            actions={<>
              <CardButton active={cardView === 'short_expiry'} onClick={() => toggleCardView('short_expiry')}>
                {cardView === 'short_expiry' ? 'Show all' : 'View'}
              </CardButton>
              <CardButton onClick={printShortExpiries}>Print</CardButton>
            </>}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Re-order Levels"
            value={metrics.reorderLevels}
            icon={<InventoryIcon sx={{ color: 'error.main' }} />}
            color="error"
            actions={<>
              <CardButton active={cardView === 'reorder'} onClick={() => toggleCardView('reorder')}>
                {cardView === 'reorder' ? 'Show all' : 'View'}
              </CardButton>
              <CardButton onClick={requisitionReorderItems}>Create Requisition</CardButton>
            </>}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} lg={2.5}>
          <MetricCard
            title="Stock Value at Cost"
            value={`Ksh ${money(metrics.totalValue)}`}
            icon={<AttachMoneyIcon sx={{ color: 'success.main' }} />}
            color="success"
            smallValue
            subtitle={`${metrics.totalItems} lot${metrics.totalItems !== 1 ? 's' : ''} shown`}
          />
        </Grid>
      </Grid>

      <div className="flex justify-end gap-2 my-4">
        <Link href="/dashboard/inventory/create-requisition">
          <div className="bg-primary text-white rounded-md px-4 py-2 text-sm cursor-pointer">
            Create Requisition
          </div>
        </Link>
        <Link href="/dashboard/inventory/add-inventory">
          <div className="bg-primary text-white rounded-md px-4 py-2 text-sm cursor-pointer">
            Add Inventory
          </div>
        </Link>
      </div>
      {cardView && (
        <div className="flex items-center gap-3 mb-2 text-sm">
          <span>
            Showing {cardView === 'short_expiry'
              ? 'lots expiring in the next 90 days'
              : 'items at or below their re-order level (stock across all lots)'}
          </span>
          <button type="button" className="text-link underline" onClick={() => setCardView(null)}>
            Show all stock
          </button>
        </div>
      )}
      <SearchOnlyFilter
        selectedFilter={processFilter}
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter}
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />

      <DataGrid
        dataSource={gridRows}
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
        <Column dataField="item_code" caption="Code" />
        <Column dataField="item_name" caption="Name" />
        <Column dataField="category_display" caption="Category" />
        <Column dataField="category_one" caption="Use" />
        <Column dataField="department_name" caption="Department" />
        <Column dataField="lot_number" caption="Lot No" />
        <Column dataField="expiry_date" caption="Expiry Date" />
        <Column dataField="purchase_price" caption="Unit Cost" cellRender={renderPurchasePrice} />
        <Column dataField="quantity_at_hand" caption="This Lot" cellRender={renderPackQuantity} />
        <Column dataField="total_quantity" caption="All Lots" cellRender={renderTotalPackQuantity} />
        <Column
          dataField="unit_conversions"
          caption="Sells In"
          allowSorting={false}
          cellRender={renderPackaging}
        />
        <Column dataField="lot_value" caption="This Lot Value" cellRender={renderLotValue} />
        {isAdmin(auth) && (
          <Column
            caption=""
            width={70}
            allowSorting={false}
            cellRender={({ data }) => (
              <button
                type="button"
                className="text-warning underline text-xs"
                onClick={() => {
                  setRowToDelete(data);
                  setDeleteOpen(true);
                }}
              >
                Delete
              </button>
            )}
          />
        )}
      </DataGrid>
      <ForceDeleteDialog
        open={deleteOpen}
        setOpen={setDeleteOpen}
        resource="stock"
        id={rowToDelete?.id}
        name={rowToDelete ? `${rowToDelete.item_name}, lot ${rowToDelete.lot_number}` : "This stock"}
        onDeleted={() => dispatch(getAllInventories(auth))}
      />
    </section>
  );
};

export default InventoryDataGrid;
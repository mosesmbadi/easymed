import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { Grid, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "@/assets/hooks/use-auth";
import { fetchStockMovements } from "@/redux/service/inventory";
import { getAllTheDepartments } from "@/redux/features/auth";
import { formatMoney } from "@/functions/money";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [10, 25, 50, "all"];

// Every way stock can move. Kept in sync with StockMovement.Type on the backend.
const MOVEMENT_TYPES = [
  { value: "", label: "All movements" },
  { value: "OPENING_BALANCE", label: "Opening balance" },
  { value: "RECEIPT", label: "Goods received" },
  { value: "SALE", label: "Sale / dispense" },
  { value: "CONSUMPTION", label: "Internal consumption" },
  { value: "TRANSFER_IN", label: "Transfer in" },
  { value: "TRANSFER_OUT", label: "Transfer out" },
  { value: "ADJUSTMENT", label: "Stock take adjustment" },
  { value: "WASTAGE", label: "Wastage" },
  { value: "EXPIRY_WRITE_OFF", label: "Expiry write-off" },
  { value: "RETURN_TO_SUPPLIER", label: "Return to supplier" },
  { value: "RETURN_FROM_ISSUE", label: "Return from ward" },
  { value: "REVERSAL", label: "Reversal" },
];

/**
 * The stock ledger.
 *
 * Nothing here is editable: a movement is a fact that happened. Mistakes are
 * corrected with a reversal, which appears as its own row.
 */
const StockMovements = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const { departments = [] } = useSelector((store) => store.auth);

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");

  const loadMovements = useCallback(() => {
    if (!auth?.token) return;

    setLoading(true);
    fetchStockMovements(auth, {
      movement_type: movementType || undefined,
      department: department || undefined,
      search: search || undefined,
    })
      .then((data) => {
        setMovements(Array.isArray(data) ? data : data?.results ?? []);
      })
      .catch((err) => {
        toast.error(typeof err === "string" ? err : "Could not load stock movements");
      })
      .finally(() => setLoading(false));
  }, [auth, movementType, department, search]);

  useEffect(() => {
    if (auth?.token) dispatch(getAllTheDepartments(auth));
  }, [auth, dispatch]);

  useEffect(() => {
    const timer = setTimeout(loadMovements, 400);
    return () => clearTimeout(timer);
  }, [loadMovements]);

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let value = 0;
    movements.forEach((movement) => {
      const quantity = parseInt(movement.quantity, 10) || 0;
      if (quantity > 0) inflow += quantity;
      else outflow += Math.abs(quantity);
      value += parseFloat(movement.total_cost) || 0;
    });
    return { inflow, outflow, value };
  }, [movements]);

  const renderQuantity = ({ data }) => {
    const quantity = parseInt(data.quantity, 10) || 0;
    const colour = quantity > 0 ? "text-green-700" : "text-red-700";
    return (
      <span className={`${colour} font-semibold`}>
        {quantity > 0 ? `+${quantity}` : quantity}
      </span>
    );
  };

  const renderOccurredAt = ({ data }) =>
    new Date(data.occurred_at).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderCost = ({ data }) => formatMoney(data.total_cost);

  const renderSource = ({ data }) =>
    data.source_reference || data.reason || data.source_type;

  return (
    <section className="my-4">
      <h3 className="text-xl mb-1">Stock Movements</h3>
      <p className="text-sm text-gray-500 mb-4">
        Every change to stock, oldest entry preserved. Quantities on the inventory
        screen are the running total of these rows.
      </p>

      <Grid container spacing={2} className="mb-4">
        <Grid item xs={12} md={3}>
          <TextField
            select
            size="small"
            fullWidth
            label="Movement type"
            value={movementType}
            onChange={(event) => setMovementType(event.target.value)}
          >
            {MOVEMENT_TYPES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            select
            size="small"
            fullWidth
            label="Location"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <MenuItem value="">All locations</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            size="small"
            fullWidth
            label="Search item, lot, document or reason"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Grid>
      </Grid>

      <div className="flex gap-6 text-sm mb-3">
        <span>
          In: <strong className="text-green-700">+{totals.inflow}</strong>
        </span>
        <span>
          Out: <strong className="text-red-700">-{totals.outflow}</strong>
        </span>
        <span>
          Net value: <strong>{formatMoney(totals.value)}</strong>
        </span>
        <span className="text-gray-500">{movements.length} movements</span>
      </div>

      <DataGrid
        dataSource={movements}
        allowColumnReordering
        rowAlternationEnabled
        showBorders
        remoteOperations={false}
        showColumnLines
        showRowLines
        wordWrapEnabled
        allowPaging
        className="shadow-xl"
        noDataText={loading ? "Loading movements..." : "No stock movements found"}
      >
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={25} />
        <Pager
          visible
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector
          showNavigationButtons
        />
        <Column dataField="occurred_at" caption="When" cellRender={renderOccurredAt} />
        <Column dataField="movement_type_display" caption="Movement" />
        <Column dataField="item_name" caption="Item" />
        <Column dataField="lot_number" caption="Lot" />
        <Column dataField="expiry_date" caption="Expiry" dataType="date" />
        <Column dataField="department_name" caption="Location" />
        <Column dataField="quantity" caption="Qty" cellRender={renderQuantity} />
        <Column dataField="balance_after" caption="Balance after" />
        <Column dataField="unit_cost" caption="Unit cost" />
        <Column dataField="total_cost" caption="Value" cellRender={renderCost} />
        <Column caption="Source" cellRender={renderSource} />
        <Column dataField="performed_by_name" caption="By" />
      </DataGrid>
    </section>
  );
};

export default StockMovements;

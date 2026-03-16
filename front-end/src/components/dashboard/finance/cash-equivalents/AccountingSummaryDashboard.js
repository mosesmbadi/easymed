import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  Column,
  Paging,
  Pager,
  SearchPanel,
  FilterRow,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid";
import { getAccountingSummary, fetchSubAccounts } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";
import { Print as PrintIcon } from "@mui/icons-material";
import { Button, CircularProgress } from "@mui/material";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), { ssr: false });

const allowedPageSizes = [5, 10, 25, "all"];

const fmt = (value) =>
  `Ksh ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const AccountingSummaryDashboard = () => {
  const [subAccountRows, setSubAccountRows] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null); // { type: 'main'|'sub', value, subValue? }
  const auth = useAuth();

  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (startDate) filters.start_date = startDate;
      if (endDate) filters.end_date = endDate;

      const [subAccounts, summary] = await Promise.all([
        fetchSubAccounts(auth),
        getAccountingSummary(auth, filters),
      ]);

      // Build lookup from summary totals keyed by "mainAccount::subAccount"
      const lookup = {};
      for (const row of summary.sub_account_totals || []) {
        lookup[`${row.main_account}::${row.sub_account}`] = row;
      }

      // Merge: every sub-account appears, with debit/credit from summary
      const merged = (subAccounts || []).map((sa) => {
        const key = `${sa.main_account_name}::${sa.name}`;
        const totals = lookup[key] || {};
        return {
          main_account: sa.main_account_name,
          sub_account: sa.name,
          total_debit: totals.total_debited || 0,
          total_credit: totals.total_credited || 0,
          opening_balance: parseFloat(sa.opening_bal) || 0,
          balance: parseFloat(sa.balance) || 0,
        };
      });

      setSubAccountRows(merged);
      setAllTransactions(summary.transactions || []);
      setFilteredTransactions(summary.transactions || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch accounting summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) {
      loadData();
    }
  }, [auth, startDate, endDate]);

  // Click on a cell → filter by main account or sub account
  const handleCellClick = (e) => {
    if (!e.data || e.rowType !== "data") return;
    const { main_account, sub_account } = e.data;
    const field = e.column?.dataField;

    if (field === "main_account") {
      // Filter transactions by main account only
      setActiveFilter({ type: "main", value: main_account });
      setFilteredTransactions(
        allTransactions.filter((t) => t.tag === main_account)
      );
    } else if (field === "sub_account") {
      // Filter transactions by specific sub account
      setActiveFilter({ type: "sub", value: main_account, subValue: sub_account });
      setFilteredTransactions(
        allTransactions.filter(
          (t) => t.tag === main_account && t.sub_account === sub_account
        )
      );
    }
  };

  const clearSubFilter = () => {
    setActiveFilter(null);
    setFilteredTransactions(allTransactions);
  };

  // Highlight helper: returns true if row matches the active filter
  const isRowActive = (rowData) => {
    if (!activeFilter) return false;
    if (activeFilter.type === "main") {
      return rowData.main_account === activeFilter.value;
    }
    if (activeFilter.type === "sub") {
      return (
        rowData.main_account === activeFilter.value &&
        rowData.sub_account === activeFilter.subValue
      );
    }
    return false;
  };

  const onRowPrepared = (e) => {
    if (e.rowType === "data" && isRowActive(e.data)) {
      e.rowElement.style.backgroundColor = "#dbeafe"; // blue-100
      e.rowElement.style.fontWeight = "600";
    }
  };

  const dateRangeLabel = () => {
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Up to ${endDate}`;
    return "All dates";
  };

  const [printingSummary, setPrintingSummary] = useState(false);
  const [printingTransactions, setPrintingTransactions] = useState(false);

  const fetchPdf = useCallback(async (reportType, filterMain, filterSub) => {
    const params = new URLSearchParams();
    params.set('report', reportType);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (filterMain) params.set('filter_main', filterMain);
    if (filterSub) params.set('filter_sub', filterSub);

    const resp = await fetch(`/api/billing/accounting-summary-pdf?${params.toString()}`, {
      headers: { Authorization: `Bearer ${auth?.token}` },
    });

    if (!resp.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [auth, startDate, endDate]);

  const handlePrintSummary = useCallback(async () => {
    setPrintingSummary(true);
    try {
      await fetchPdf('summary');
    } catch (error) {
      toast.error('Failed to generate summary PDF');
      console.error(error);
    } finally {
      setPrintingSummary(false);
    }
  }, [fetchPdf]);

  const handlePrintTransactions = useCallback(async () => {
    setPrintingTransactions(true);
    try {
      const filterMain = activeFilter?.value || undefined;
      const filterSub = activeFilter?.type === 'sub' ? activeFilter.subValue : undefined;
      await fetchPdf('transactions', filterMain, filterSub);
    } catch (error) {
      toast.error('Failed to generate transactions PDF');
      console.error(error);
    } finally {
      setPrintingTransactions(false);
    }
  }, [fetchPdf, activeFilter]);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Date Filters ── */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded shadow-sm">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-semibold">From:</label>
          <input
            type="date"
            className="border p-2 rounded text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <label className="text-sm font-semibold">To:</label>
          <input
            type="date"
            className="border p-2 rounded text-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {(startDate || endDate) && (
          <button
            className="text-sm text-gray-500 underline"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear dates
          </button>
        )}

        <button
          className="bg-primary text-white px-4 py-2 rounded text-sm"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* ── Sub-Account Table ── */}
      <div className="bg-white rounded shadow-md p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-primary">Account Summary</h3>
          <Button
            variant="outlined"
            size="small"
            startIcon={printingSummary ? <CircularProgress size={16} /> : <PrintIcon />}
            onClick={handlePrintSummary}
            disabled={printingSummary}
            sx={{ textTransform: 'none' }}
          >
            {printingSummary ? 'Generating…' : 'Print Summary'}
          </Button>
        </div>
        <DataGrid
          dataSource={subAccountRows}
          allowColumnReordering
          rowAlternationEnabled
          showBorders
          showColumnLines
          showRowLines
          wordWrapEnabled
          className="shadow-sm cursor-pointer"
          onCellClick={handleCellClick}
          onRowPrepared={onRowPrepared}
        >
          <FilterRow visible />
          <SearchPanel visible placeholder="Search sub-accounts…" />
          <Column
            dataField="main_account"
            caption="Main Account"
            sortIndex={0}
            sortOrder="asc"
            cellRender={(cell) => {
              const isActive = activeFilter?.type === "main" && activeFilter.value === cell.value;
              return (
                <span className={`cursor-pointer hover:underline ${isActive ? "text-primary font-bold" : ""}`}>
                  {cell.value}
                </span>
              );
            }}
          />
          <Column
            dataField="sub_account"
            caption="Sub Account"
            sortIndex={1}
            sortOrder="asc"
            cellRender={(cell) => {
              const isActive =
                activeFilter?.type === "sub" &&
                activeFilter.value === cell.data.main_account &&
                activeFilter.subValue === cell.value;
              return (
                <span className={`cursor-pointer hover:underline ${isActive ? "text-primary font-bold" : ""}`}>
                  {cell.value}
                </span>
              );
            }}
          />
          <Column
            dataField="total_debit"
            caption="Total Debit"
            customizeText={(c) => fmt(c.value)}
            cellRender={(cell) => (
              <span className="text-green-700">{fmt(cell.value)}</span>
            )}
          />
          <Column
            dataField="total_credit"
            caption="Total Credit"
            customizeText={(c) => fmt(c.value)}
            cellRender={(cell) => (
              <span className="text-red-600">{fmt(cell.value)}</span>
            )}
          />
          <Column
            dataField="balance"
            caption="Balance"
            customizeText={(c) => fmt(c.value)}
            cellRender={(cell) => {
              const val = Number(cell.value || 0);
              return (
                <span className={val >= 0 ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                  {fmt(val)}
                </span>
              );
            }}
          />
          <Summary>
            <TotalItem
              column="sub_account"
              summaryType="count"
              customizeText={() => "TOTAL"}
            />
            <TotalItem
              column="total_debit"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
            <TotalItem
              column="total_credit"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
            <TotalItem
              column="balance"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
          </Summary>
        </DataGrid>
      </div>

      {/* ── Transactions Drill-down ── */}
      <div className="bg-white rounded shadow-md p-4">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-primary">
            Transactions
          </h3>
          {activeFilter && (
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {activeFilter.type === "main"
                ? activeFilter.value
                : `${activeFilter.value} › ${activeFilter.subValue}`}
            </span>
          )}
          {filteredTransactions.length !== allTransactions.length && (
            <button
              className="text-xs text-blue-600 underline"
              onClick={clearSubFilter}
            >
              Show all ({allTransactions.length})
            </button>
          )}
          <div className="ml-auto">
            <Button
              variant="outlined"
              size="small"
              startIcon={printingTransactions ? <CircularProgress size={16} /> : <PrintIcon />}
              onClick={handlePrintTransactions}
              disabled={printingTransactions}
              sx={{ textTransform: 'none' }}
            >
              {printingTransactions ? 'Generating…' : 'Print Transactions'}
            </Button>
          </div>
        </div>
        <DataGrid
          dataSource={filteredTransactions}
          allowColumnReordering
          allowSorting
          rowAlternationEnabled
          showBorders
          showColumnLines
          showRowLines
          wordWrapEnabled
          className="shadow-sm"
        >
          <SearchPanel visible placeholder="Search transactions…" />
          <FilterRow visible />
          <Paging defaultPageSize={10} />
          <Pager
            visible
            allowedPageSizes={allowedPageSizes}
            showPageSizeSelector
            showInfo
            showNavigationButtons
          />
          <Column dataField="date" caption="Date" width={120} defaultSortOrder="desc" sortIndex={0} />
          <Column dataField="invoice_number" caption="Invoice #" width={130} />
          <Column dataField="customer" caption="Particulars" />
          <Column
            dataField="sub_account"
            caption="Sub Account"
            cellRender={(cell) => (
              <span className="px-2 py-0.5 bg-blue-50 rounded text-xs">{cell.value}</span>
            )}
          />
          <Column
            dataField="action"
            caption="Type"
            width={120}
            cellRender={(cell) => {
              const isCredit = cell.value === "Received";
              return (
                <span
                  className={
                    isCredit
                      ? "text-green-600 font-medium"
                      : "text-red-500 font-medium"
                  }
                >
                  {isCredit ? "Credit" : "Debit"}
                </span>
              );
            }}
          />
          <Column
            dataField="amount"
            caption="Amount"
            customizeText={(c) => fmt(c.value)}
          />
        </DataGrid>
      </div>
    </div>
  );
};

export default AccountingSummaryDashboard;

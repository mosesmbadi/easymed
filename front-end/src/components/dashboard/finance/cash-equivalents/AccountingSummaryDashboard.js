import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  Column,
  Paging,
  Pager,
  SearchPanel,
  FilterRow,
  GroupPanel,
  Grouping,
  Summary,
  TotalItem,
  GroupItem,
} from "devextreme-react/data-grid";
import { getAccountingSummary } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), { ssr: false });

const allowedPageSizes = [5, 10, 25, "all"];

const fmt = (value) =>
  `Ksh ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const AccountingSummaryDashboard = () => {
  const [subAccountTotals, setSubAccountTotals] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
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

      const res = await getAccountingSummary(auth, filters);
      setSubAccountTotals(res.sub_account_totals || []);
      setAllTransactions(res.transactions || []);
      setFilteredTransactions(res.transactions || []);
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

  // Click on sub-account row → filter transactions by both main + sub account
  const handleSubAccountRowClick = (e) => {
    const { main_account, sub_account } = e.data || {};
    if (main_account && sub_account) {
      setFilteredTransactions(
        allTransactions.filter(
          (t) => t.tag === main_account && t.sub_account === sub_account
        )
      );
    }
  };

  const clearSubFilter = () => setFilteredTransactions(allTransactions);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header / Filters ── */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded shadow-sm">
        <h2 className="text-xl font-bold mr-auto">
          Cashflow Summary (Received &amp; Supplier Payments)
        </h2>

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

      {/* ── Sub-Account Summary ── */}
      <div className="bg-white rounded shadow-md p-4">
        <h3 className="text-lg font-semibold mb-1 text-primary">Sub-Account Summary</h3>
        <p className="text-sm mb-4 text-gray-500">
          Total Debits, Credits and Balance per sub-account grouped by main account (Bank,
          Cash, Petty Cash, Mobile Banking). Click a row to filter the transactions table.
        </p>
        <DataGrid
          dataSource={subAccountTotals}
          allowColumnReordering
          rowAlternationEnabled
          showBorders
          showColumnLines
          showRowLines
          wordWrapEnabled
          className="shadow-sm cursor-pointer"
          onRowClick={handleSubAccountRowClick}
        >
          <GroupPanel visible />
          <Grouping autoExpandAll />
          <SearchPanel visible placeholder="Search sub-accounts…" />
          <Column dataField="main_account" caption="Main Account" groupIndex={0} sortIndex={0} sortOrder="asc" />
          <Column dataField="sub_account" caption="Sub Account" sortIndex={1} sortOrder="asc" />
          <Column
            dataField="total_debited"
            caption="Total Debits (+)"
            customizeText={(c) => fmt(c.value)}
            cellRender={(cell) => (
              <span className="text-green-700">{fmt(cell.value)}</span>
            )}
          />
          <Column
            dataField="total_credited"
            caption="Total Credits (-)"
            customizeText={(c) => fmt(c.value)}
            cellRender={(cell) => (
              <span className="text-red-600">{fmt(cell.value)}</span>
            )}
          />
          <Column
            dataField="net_balance"
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
              column="total_debited"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
            <TotalItem
              column="total_credited"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
            <TotalItem
              column="net_balance"
              summaryType="sum"
              valueFormat="fixedPoint"
              customizeText={(e) => fmt(e.value)}
            />
            <GroupItem
              column="total_debited"
              summaryType="sum"
              displayFormat="{0}"
              customizeText={(e) => fmt(e.value)}
              showInGroupFooter={false}
              alignByColumn
            />
            <GroupItem
              column="total_credited"
              summaryType="sum"
              displayFormat="{0}"
              customizeText={(e) => fmt(e.value)}
              showInGroupFooter={false}
              alignByColumn
            />
            <GroupItem
              column="net_balance"
              summaryType="sum"
              displayFormat="{0}"
              customizeText={(e) => fmt(e.value)}
              showInGroupFooter={false}
              alignByColumn
            />
          </Summary>
        </DataGrid>
      </div>

      {/* ── Transactions Drill-down ── */}
      <div className="bg-white rounded shadow-md p-4">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-primary">
            Transactions (Received &amp; Supplier Payments)
          </h3>
          {filteredTransactions.length !== allTransactions.length && (
            <button
              className="text-xs text-blue-600 underline"
              onClick={clearSubFilter}
            >
              Show all ({allTransactions.length})
            </button>
          )}
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
            dataField="tag"
            caption="Sub Account"
            cellRender={(cell) => (
              <span className="px-2 py-0.5 bg-blue-50 rounded text-xs">{cell.value}</span>
            )}
          />
          <Column
            dataField="sub_account"
            caption="Sub Account"
            cellRender={(cell) => (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{cell.value}</span>
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

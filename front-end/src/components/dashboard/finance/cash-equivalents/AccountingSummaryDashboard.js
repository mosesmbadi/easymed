import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  Column,
  Paging,
  Pager,
  SearchPanel,
  FilterRow,
} from "devextreme-react/data-grid";
import { getAccountingSummary, fetchSubAccounts } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";
import { Print as PrintIcon, KeyboardArrowDown, KeyboardArrowRight } from "@mui/icons-material";
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
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [summarySearch, setSummarySearch] = useState("");
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

  const clearSubFilter = () => {
    setActiveFilter(null);
    setFilteredTransactions(allTransactions);
  };

  // Group sub-account rows by main_account for collapsible display
  const groupedAccounts = useMemo(() => {
    const groups = {};
    const searchLower = summarySearch.toLowerCase();

    for (const row of subAccountRows) {
      // Apply search filter
      if (
        searchLower &&
        !row.main_account.toLowerCase().includes(searchLower) &&
        !row.sub_account.toLowerCase().includes(searchLower)
      ) {
        continue;
      }

      const key = row.main_account;
      if (!groups[key]) {
        groups[key] = {
          main_account: key,
          opening_balance: 0,
          total_debit: 0,
          total_credit: 0,
          balance: 0,
          subAccounts: [],
        };
      }
      groups[key].opening_balance += Number(row.opening_balance || 0);
      groups[key].total_debit += Number(row.total_debit || 0);
      groups[key].total_credit += Number(row.total_credit || 0);
      groups[key].balance += Number(row.balance || 0);
      groups[key].subAccounts.push(row);
    }

    return Object.values(groups).sort((a, b) =>
      a.main_account.localeCompare(b.main_account)
    );
  }, [subAccountRows, summarySearch]);

  const grandTotals = useMemo(() => {
    return groupedAccounts.reduce(
      (acc, g) => ({
        opening_balance: acc.opening_balance + g.opening_balance,
        total_debit: acc.total_debit + g.total_debit,
        total_credit: acc.total_credit + g.total_credit,
        balance: acc.balance + g.balance,
      }),
      { opening_balance: 0, total_debit: 0, total_credit: 0, balance: 0 }
    );
  }, [groupedAccounts]);

  const toggleExpand = (mainAccount) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(mainAccount)) {
        next.delete(mainAccount);
      } else {
        next.add(mainAccount);
      }
      return next;
    });
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

      {/* ── Account Summary (Grouped) ── */}
      <div className="bg-white rounded shadow-md p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-primary">Account Summary</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search accounts…"
              className="border rounded px-3 py-1.5 text-sm w-56"
              value={summarySearch}
              onChange={(e) => setSummarySearch(e.target.value)}
            />
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                <th className="text-left px-4 py-3 font-semibold w-8"></th>
                <th className="text-left px-4 py-3 font-semibold">Account</th>
                <th className="text-right px-4 py-3 font-semibold">Opening Balance</th>
                <th className="text-right px-4 py-3 font-semibold">Total Debit</th>
                <th className="text-right px-4 py-3 font-semibold">Total Credit</th>
                <th className="text-right px-4 py-3 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {groupedAccounts.map((group) => {
                const isExpanded = expandedAccounts.has(group.main_account);
                const isMainActive = activeFilter?.type === "main" && activeFilter.value === group.main_account;

                return (
                  <React.Fragment key={group.main_account}>
                    {/* Main Account Row */}
                    <tr
                      className={`border-b border-gray-200 cursor-pointer transition-colors hover:bg-blue-50 ${
                        isMainActive ? "bg-blue-100 font-bold" : "bg-gray-50"
                      }`}
                      onClick={() => toggleExpand(group.main_account)}
                    >
                      <td className="px-4 py-3">
                        {isExpanded ? (
                          <KeyboardArrowDown fontSize="small" className="text-gray-600" />
                        ) : (
                          <KeyboardArrowRight fontSize="small" className="text-gray-600" />
                        )}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold text-gray-800 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveFilter({ type: "main", value: group.main_account });
                          setFilteredTransactions(
                            allTransactions.filter((t) => t.tag === group.main_account)
                          );
                        }}
                      >
                        {group.main_account}
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          ({group.subAccounts.length} sub-account{group.subAccounts.length !== 1 ? "s" : ""})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-semibold">
                        {fmt(group.opening_balance)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-semibold">
                        {fmt(group.total_debit)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">
                        {fmt(group.total_credit)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        group.balance >= 0 ? "text-green-700" : "text-red-600"
                      }`}>
                        {fmt(group.balance)}
                      </td>
                    </tr>

                    {/* Sub Account Rows (collapsible) */}
                    {isExpanded &&
                      group.subAccounts
                        .sort((a, b) => a.sub_account.localeCompare(b.sub_account))
                        .map((sub) => {
                          const isSubActive =
                            activeFilter?.type === "sub" &&
                            activeFilter.value === sub.main_account &&
                            activeFilter.subValue === sub.sub_account;

                          return (
                            <tr
                              key={`${sub.main_account}::${sub.sub_account}`}
                              className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50 ${
                                isSubActive ? "bg-blue-100 font-semibold" : ""
                              }`}
                              onClick={() => {
                                setActiveFilter({
                                  type: "sub",
                                  value: sub.main_account,
                                  subValue: sub.sub_account,
                                });
                                setFilteredTransactions(
                                  allTransactions.filter(
                                    (t) =>
                                      t.tag === sub.main_account &&
                                      t.sub_account === sub.sub_account
                                  )
                                );
                              }}
                            >
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 pl-12 text-gray-600 hover:underline">
                                <span className="px-2 py-0.5 bg-blue-50 rounded text-xs">
                                  {sub.sub_account}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {fmt(sub.opening_balance)}
                              </td>
                              <td className="px-4 py-2 text-right text-green-700">
                                {fmt(sub.total_debit)}
                              </td>
                              <td className="px-4 py-2 text-right text-red-600">
                                {fmt(sub.total_credit)}
                              </td>
                              <td className={`px-4 py-2 text-right ${
                                Number(sub.balance || 0) >= 0
                                  ? "text-green-700 font-medium"
                                  : "text-red-600 font-medium"
                              }`}>
                                {fmt(sub.balance)}
                              </td>
                            </tr>
                          );
                        })}
                  </React.Fragment>
                );
              })}

              {/* Grand Total Row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-gray-800">TOTAL</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {fmt(grandTotals.opening_balance)}
                </td>
                <td className="px-4 py-3 text-right text-green-700">
                  {fmt(grandTotals.total_debit)}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {fmt(grandTotals.total_credit)}
                </td>
                <td className={`px-4 py-3 text-right ${
                  grandTotals.balance >= 0 ? "text-green-700" : "text-red-600"
                }`}>
                  {fmt(grandTotals.balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { getAccountingSummary } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), { ssr: false });
const Column = dynamic(() => import("devextreme-react/data-grid").then(mod => mod.Column), { ssr: false });
const Paging = dynamic(() => import("devextreme-react/data-grid").then(mod => mod.Paging), { ssr: false });
const Pager = dynamic(() => import("devextreme-react/data-grid").then(mod => mod.Pager), { ssr: false });
const Scrolling = dynamic(() => import("devextreme-react/data-grid").then(mod => mod.Scrolling), { ssr: false });

const allowedPageSizes = [5, 10, 'all'];

const AccountingSummaryDashboard = () => {
  const [totals, setTotals] = useState([]);
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
      setTotals(res.totals || []);
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

  const handleRowClick = (e) => {
    // e.data contains the row data
    const selectedTag = e.data.tag;
    if (selectedTag === "TOTAL") {
      setFilteredTransactions(allTransactions);
    } else {
      const filtered = allTransactions.filter(t => t.tag === selectedTag);
      setFilteredTransactions(filtered);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Filters Header */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded shadow-sm">
        <h2 className="text-xl font-bold mr-auto">Accounting Summary</h2>
        <div className="flex gap-2 items-center">
            <label className="text-sm font-semibold">Start Date:</label>
            <input 
                type="date" 
                className="border p-2 rounded"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
            />
        </div>
        <div className="flex gap-2 items-center">
            <label className="text-sm font-semibold">End Date:</label>
            <input 
                type="date" 
                className="border p-2 rounded"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
            />
        </div>
        <button 
            className="bg-primary text-white px-4 py-2 rounded"
            onClick={loadData}
        >
            Refresh
        </button>
      </div>

      {/* Bird&apos;s Eye View (Totals) */}
      <div className="bg-white rounded shadow-md p-4">
        <h3 className="text-lg font-semibold mb-2 text-primary">Departmental Totals</h3>
        <p className="text-sm mb-4 text-gray-500">Click a row to drill down into its specific transactions below.</p>
        <DataGrid
          dataSource={totals}
          allowColumnReordering={true}
          rowAlternationEnabled={true}
          showBorders={true}
          showColumnLines={true}
          showRowLines={true}
          wordWrapEnabled={true}
          className="shadow-sm cursor-pointer"
          onRowClick={handleRowClick}
        >
          <Scrolling rowRenderingMode='virtual'></Scrolling>
          <Column dataField="tag" caption="Account Tag" cellRender={(cell) => {
              if(cell.data.is_summary) return <span className="font-bold">{cell.value}</span>;
              return cell.value;
          }}/>
          <Column 
            dataField="total_debited" 
            caption="Total Debited (+)" 
            customizeText={(cellInfo) => `$${Number(cellInfo.value).toLocaleString()}`}
            cellRender={(cell) => {
                if(cell.data.is_summary) return <span className="font-bold">${Number(cell.value).toLocaleString()}</span>;
                return `$${Number(cell.value).toLocaleString()}`;
            }}
          />
          <Column 
            dataField="total_credited" 
            caption="Total Credited (-)" 
            customizeText={(cellInfo) => `$${Number(cellInfo.value).toLocaleString()}`}
            cellRender={(cell) => {
                if(cell.data.is_summary) return <span className="font-bold">${Number(cell.value).toLocaleString()}</span>;
                return `$${Number(cell.value).toLocaleString()}`;
            }}
          />
          <Column 
            dataField="net_balance" 
            caption="Net Balance" 
            customizeText={(cellInfo) => `$${Number(cellInfo.value).toLocaleString()}`}
            cellRender={(cell) => {
                if(cell.data.is_summary) return <span className="font-bold text-green-700">${Number(cell.value).toLocaleString()}</span>;
                return `$${Number(cell.value).toLocaleString()}`;
            }}
          />
        </DataGrid>
      </div>

      {/* Granular View (Transactions) */}
      <div className="bg-white rounded shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4 text-primary">Transaction Breakdown (The &quot;Drill Down&quot;)</h3>
        <DataGrid
          dataSource={filteredTransactions}
          allowColumnReordering={true}
          rowAlternationEnabled={true}
          showBorders={true}
          showColumnLines={true}
          showRowLines={true}
          wordWrapEnabled={true}
          allowPaging={true}
          className="shadow-sm"
        >
          <Paging defaultPageSize={10} />
          <Pager
            visible={true}
            allowedPageSizes={allowedPageSizes}
            showPageSizeSelector={true}
            showInfo={true}
            showNavigationButtons={true}
          />
          <Column dataField="date" caption="Date" width={120} />
          <Column dataField="invoice_number" caption="Invoice #" />
          <Column dataField="customer" caption="Customer" />
          <Column dataField="tag" caption="Tag" cellRender={(cell) => {
              // Highlight the tag
              return <span className="px-2 py-1 bg-gray-100 rounded text-xs">{cell.value}</span>;
          }}/>
          <Column dataField="action" caption="Action" width={100} cellRender={(cell) => {
              return <span className={cell.value === 'Debit' ? "text-green-600" : "text-red-500"}>{cell.value}</span>;
          }}/>
          <Column 
            dataField="amount" 
            caption="Amount" 
            customizeText={(cellInfo) => `$${Number(cellInfo.value).toLocaleString()}`}
          />
        </DataGrid>
      </div>

    </div>
  );
};

export default AccountingSummaryDashboard;

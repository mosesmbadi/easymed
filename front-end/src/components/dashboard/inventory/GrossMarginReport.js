import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling, Summary, TotalItem } from 'devextreme-react/data-grid';
import { toast } from 'react-toastify';

import { useAuth } from '@/assets/hooks/use-auth';
import { grossMargin } from '@/redux/service/reports';

const DataGrid = dynamic(() => import('devextreme-react/data-grid'), { ssr: false });

const money = (value) =>
  `Ksh ${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const CATEGORIES = [
  ['', 'All categories'],
  ['Lab Test', 'Lab Tests'],
  ['Drug', 'Drugs'],
  ['General Appointment', 'General Appointments'],
  ['Specialized Appointment', 'Specialized Appointments'],
  ['SurgicalEquipment', 'Surgical Equipment'],
  ['general', 'General'],
];

const Metric = ({ label, value, hint, tone }) => (
  <div className="bg-white shadow rounded-lg p-4 h-full">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${tone ?? ''}`}>{value}</p>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

/**
 * Revenue against the cost of what was actually consumed to earn it.
 *
 * Every outflow in the stock ledger carries the unit cost it left at, so this
 * is measured, not estimated. The one exception is the share of a sample
 * collection spread across the tests ordered off it -- three panels off one
 * tube of blood each carry a third of the syringe -- which is a convention, so
 * it gets its own column rather than being folded silently into the total.
 *
 * The "unpriced cost" warning matters more than it looks: an item billed with
 * no recorded consumption shows a 100% margin, which is a statement about the
 * setup rather than the profitability.
 */
const GrossMarginReport = () => {
  const auth = useAuth();
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    if (!auth?.token) return;
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      if (category) params.category = category;
      setReport(await grossMargin(params, auth));
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Could not load the margin report');
    } finally {
      setLoading(false);
    }
  }, [auth?.token, startDate, endDate, category]);

  useEffect(() => {
    load();
    // Re-run on an explicit filter change only; `load` is stable for a given filter set.
  }, [auth?.token]);

  const totals = report?.totals;
  const rows = report?.rows ?? [];
  const unpricedShare =
    totals && totals.revenue > 0
      ? (Number(totals.revenue_without_cost) / Number(totals.revenue)) * 100
      : 0;

  return (
    <section className="my-8">
      <h3 className="text-xl mb-1">Gross Margin</h3>
      <p className="text-sm text-gray-500 mb-4">
        What was billed, against what the stock ledger says it cost to deliver.
        Costs are the real unit costs of everything issued &mdash; the drug, its
        syringe, the reagent a test burned, the tube it was drawn into.
      </p>

      <Grid container spacing={2} alignItems="flex-end" className="mb-6">
        <Grid item md={3} xs={12}>
          <label htmlFor="margin-start" className="text-sm">From</label>
          <input
            id="margin-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
          />
        </Grid>
        <Grid item md={3} xs={12}>
          <label htmlFor="margin-end" className="text-sm">To</label>
          <input
            id="margin-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
          />
        </Grid>
        <Grid item md={3} xs={12}>
          <label htmlFor="margin-category" className="text-sm">Category</label>
          <select
            id="margin-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
          >
            {CATEGORIES.map(([value, label]) => (
              <option key={value || 'all'} value={value}>{label}</option>
            ))}
          </select>
        </Grid>
        <Grid item md={3} xs={12}>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="bg-primary rounded-md text-sm px-8 py-2.5 text-white w-full"
          >
            {loading ? 'Working...' : 'Run report'}
          </button>
        </Grid>
      </Grid>

      {totals && (
        <>
          <Grid container spacing={2} className="mb-6">
            <Grid item md={3} sm={6} xs={12}>
              <Metric label="Revenue billed" value={money(totals.revenue)} />
            </Grid>
            <Grid item md={3} sm={6} xs={12}>
              <Metric label="Cost of what was consumed" value={money(totals.cost)} />
            </Grid>
            <Grid item md={3} sm={6} xs={12}>
              <Metric
                label="Gross margin"
                value={money(totals.margin)}
                tone={Number(totals.margin) < 0 ? 'text-warning' : 'text-success'}
                hint={
                  totals.margin_percent == null
                    ? 'Nothing billed in this window'
                    : `${totals.margin_percent.toFixed(1)}% of revenue`
                }
              />
            </Grid>
            <Grid item md={3} sm={6} xs={12}>
              <Metric
                label="Split by payer"
                value={money(totals.patient_revenue)}
                hint={`from patients; ${money(totals.insurer_revenue)} from insurers`}
              />
            </Grid>
          </Grid>

          {totals.items_without_cost > 0 && (
            <div className="border border-gray rounded-md p-3 mb-6 text-sm">
              <span className="font-semibold text-warning">
                {totals.items_without_cost} item
                {totals.items_without_cost === 1 ? '' : 's'} billed with no recorded cost
              </span>
              {' '}&mdash; {money(totals.revenue_without_cost)} of revenue, {unpricedShare.toFixed(0)}% of
              the total, is showing a full margin because nothing was deducted against it.
              Either the item genuinely consumes nothing, or its reagents are not linked on
              the Test Panel and its collection items are not on the Specimen. The margin
              above is an upper bound until that is settled.
            </div>
          )}
        </>
      )}

      <DataGrid
        dataSource={rows}
        allowColumnReordering
        rowAlternationEnabled
        showBorders
        showColumnLines
        showRowLines
        wordWrapEnabled
        allowPaging
        className="shadow-xl"
      >
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={15} />
        <Pager visible allowedPageSizes={[10, 15, 25, 'all']} showPageSizeSelector showInfo showNavigationButtons />

        <Column dataField="item_name" caption="Item" />
        <Column dataField="category" caption="Category" />
        <Column dataField="quantity" caption="Qty" width={70} />
        <Column dataField="revenue" caption="Revenue" cellRender={({ value }) => money(value)} />
        <Column
          dataField="direct_cost"
          caption="Goods issued"
          cellRender={({ value }) => money(value)}
        />
        <Column
          dataField="reagent_cost"
          caption="Reagents"
          cellRender={({ value }) => money(value)}
        />
        <Column
          dataField="collection_cost"
          caption="Collection (apportioned)"
          cellRender={({ value }) => money(value)}
        />
        <Column dataField="cost" caption="Total cost" cellRender={({ value }) => money(value)} />
        <Column
          dataField="margin"
          caption="Margin"
          cellRender={({ data }) => (
            <span className={Number(data.margin) < 0 ? 'text-warning font-semibold' : ''}>
              {money(data.margin)}
            </span>
          )}
        />
        <Column
          dataField="margin_percent"
          caption="Margin %"
          cellRender={({ data }) =>
            // A consultation consumes nothing, so its zero cost is the answer
            // rather than a missing link.
            data.cost_known || data.cost_expected === false
              ? `${Number(data.margin_percent ?? 0).toFixed(1)}%`
              : <span className="text-gray">no cost recorded</span>
          }
        />

        <Summary>
          <TotalItem column="revenue" summaryType="sum" customizeText={({ value }) => money(value)} />
          <TotalItem column="cost" summaryType="sum" customizeText={({ value }) => money(value)} />
          <TotalItem column="margin" summaryType="sum" customizeText={({ value }) => money(value)} />
        </Summary>
      </DataGrid>

      {report?.consumption?.length > 0 && (
        <div className="mt-8">
          <h4 className="font-semibold">Where stock went</h4>
          <p className="text-sm text-gray-500 mb-3">
            Every outflow in the window, including the ones no invoice pays for.
            A large figure against wastage, expiry or a collection with no matching
            sale is the part of the margin above that never had a chance to earn.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray">
                <th className="py-2">Reason</th>
                <th className="py-2">Movement</th>
                <th className="py-2 text-right">Units</th>
                <th className="py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {report.consumption.map((row) => (
                <tr key={`${row.source_type}-${row.movement_type}`} className="border-b border-gray">
                  <td className="py-2">{row.source_type}</td>
                  <td className="py-2">{row.movement_type}</td>
                  <td className="py-2 text-right">{row.quantity}</td>
                  <td className="py-2 text-right">{money(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default GrossMarginReport;

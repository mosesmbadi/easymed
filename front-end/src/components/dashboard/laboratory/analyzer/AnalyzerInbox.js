import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Column, Grouping, Pager, Paging } from "devextreme-react/data-grid";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import { useAuth } from "@/assets/hooks/use-auth";
import { getAllLabEquipments } from "@/redux/features/laboratory";
import {
  assignAnalyzerSample,
  fetchAnalyzerMessage,
  fetchAnalyzerResults,
  ignoreAnalyzerResult,
  retryAllAnalyzerResults,
  retryAnalyzerResult,
} from "@/redux/service/laboratory/analyzers";
import AnalyzerMappingsModal from "../lab-settings/modals/equipments/AnalyzerMappingsModal";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), { ssr: false });

const STATUS_STYLES = {
  posted: "bg-green-100 text-green-800",
  ignored: "bg-gray-100 text-gray-600",
  no_sample: "bg-red-100 text-red-800",
  sample_not_found: "bg-red-100 text-red-800",
  unmapped: "bg-yellow-100 text-yellow-800",
  not_requested: "bg-yellow-100 text-yellow-800",
  already_approved: "bg-blue-100 text-blue-800",
  invalid: "bg-red-100 text-red-800",
};

// What to do about each kind of problem, in the words of the bench.
const HOW_TO_FIX = {
  no_sample: "The sample code was not entered on the analyzer. Assign the sample.",
  sample_not_found: "Check the code, or register the sample and press Retry.",
  unmapped: "Map the code to a test panel.",
  not_requested: "Add the test to the request and press Retry, or Ignore.",
  already_approved: "The approved result was kept. Ignore, or un-approve and Retry.",
  invalid: "The value can't be stored. Enter it by hand and Ignore this one.",
};

const SAMPLE_PROBLEMS = ["no_sample", "sample_not_found"];

const formatTime = (value) => (value ? new Date(value).toLocaleString() : "");

const AssignSampleDialog = ({ message, onClose, onAssigned }) => {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setCode(message?.sample_code || ""), [message]);

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    try {
      const results = await assignAnalyzerSample(auth, message.message, code.trim());
      const posted = results.filter((row) => row.status === "posted").length;
      toast.success(`${posted} of ${results.length} results posted to ${code.trim()}`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={Boolean(message)} onClose={onClose}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-xl font-bold">Assign sample</h2>
          <p className="text-sm text-gray-600">
            Results from {message?.equipment_name || message?.sender || "the analyzer"} received{" "}
            {formatTime(message?.received_at)}
            {message?.patient_name ? ` for "${message.patient_name}"` : ""}. Enter the sample code
            from the tube label. Every result in this run is posted to it.
          </p>
          <input
            autoFocus
            className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full font-mono"
            placeholder="e.g. DDLR00012-2026"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving || !code.trim()}
              className="bg-primary rounded-xl text-sm px-6 py-2 text-white disabled:opacity-50"
            >
              Assign and post
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RawMessageDialog = ({ messageId, onClose }) => {
  const auth = useAuth();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setMessage(null);
    if (messageId) {
      fetchAnalyzerMessage(auth, messageId).then(setMessage).catch((err) => toast.error(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  return (
    <Dialog fullWidth maxWidth="md" open={Boolean(messageId)} onClose={onClose}>
      <DialogContent>
        <h2 className="text-xl font-bold mb-2">Message as received</h2>
        <p className="text-sm text-gray-600 mb-3">
          {message && `${message.equipment_name || message.sender || "Unknown analyzer"} · ${formatTime(message.received_at)}`}
        </p>
        <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
          {message ? (message.raw_message || "(not recorded)").replace(/\r/g, "\n") : "Loading..."}
        </pre>
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="text-sm px-4 py-2">Close</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AnalyzerInbox = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const { labEquipments } = useSelector((store) => store.laboratory);

  const [view, setView] = useState("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [rawMessageId, setRawMessageId] = useState(null);
  const [mappingEquipment, setMappingEquipment] = useState(null);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const params = { status: view };
      if (search.trim()) params.sample_code = search.trim();
      setRows(await fetchAnalyzerResults(auth, params));
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }, [auth, view, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (auth) dispatch(getAllLabEquipments(auth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  // One group per analyzer run, so a whole run can be assigned at once.
  const grouped = useMemo(
    () => rows.map((row) => ({ ...row, run: `${row.received_at}|${row.message}` })),
    [rows]
  );

  const act = async (promise, success) => {
    try {
      const result = await promise;
      if (success) toast.success(typeof success === "function" ? success(result) : success);
      load();
    } catch (err) {
      toast.error(err);
    }
  };

  const openMappings = (row) => {
    const equipment = labEquipments.find((item) => item.id === row.equipment);
    if (!equipment) {
      toast.info(
        `This analyzer is not recognised${row.sender ? ` (it calls itself "${row.sender}")` : ""}. ` +
          "Set that as the Sender ID of the equipment in Lab Settings first."
      );
      return;
    }
    setMappingEquipment(equipment);
  };

  const groupCell = ({ data }) => {
    const first = data.items?.[0] || data.collapsedItems?.[0];
    if (!first) return null;
    const openRows = (data.items || data.collapsedItems || []).filter((row) => row.is_open);
    const needsSample = openRows.some((row) => SAMPLE_PROBLEMS.includes(row.status));
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold">{formatTime(first.received_at)}</span>
        <span>
          {first.equipment_name || (
            <span className="text-warning">Unrecognised analyzer{first.sender ? `: ${first.sender}` : ""}</span>
          )}
        </span>
        <span className="font-mono">{first.sample_code || <span className="text-warning">no sample code</span>}</span>
        {first.patient_name && <span className="text-gray-500">&ldquo;{first.patient_name}&rdquo;</span>}
        <span className="text-gray-500">{(data.items || data.collapsedItems || []).length} results</span>
        {needsSample && (
          <button
            onClick={() => setAssigning(first)}
            className="bg-primary text-white rounded-xl text-xs px-3 py-1"
          >
            Assign sample
          </button>
        )}
        <button onClick={() => setRawMessageId(first.message)} className="text-primary text-xs underline">
          View message
        </button>
      </div>
    );
  };

  const statusCell = ({ data }) => (
    <div>
      <span className={`text-xs rounded px-2 py-0.5 ${STATUS_STYLES[data.status] || ""}`}>
        {data.status_display}
      </span>
      <p className="text-xs text-gray-600 mt-1">{data.detail}</p>
      {data.is_open && HOW_TO_FIX[data.status] && (
        <p className="text-xs text-gray-400">{HOW_TO_FIX[data.status]}</p>
      )}
    </div>
  );

  const actionsCell = ({ data }) => {
    if (!data.is_open) {
      return <span className="text-xs text-gray-400">{data.resolved_by_name || ""}</span>;
    }
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        {data.status === "unmapped" && (
          <button onClick={() => openMappings(data)} className="text-primary underline">Map code</button>
        )}
        <button
          onClick={() =>
            act(retryAnalyzerResult(auth, data.id), (row) =>
              row.status === "posted" ? `${data.analyzer_code} posted` : `${data.analyzer_code}: ${row.status_display}`
            )
          }
          className="text-primary underline"
        >
          Retry
        </button>
        <button
          onClick={() => act(ignoreAnalyzerResult(auth, data.id), `${data.analyzer_code} ignored`)}
          className="text-gray-500 underline"
        >
          Ignore
        </button>
      </div>
    );
  };

  return (
    <section className="my-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-3">
        <div>
          <h1 className="uppercase text-2xl">Analyzer Inbox</h1>
          <p className="text-sm text-gray-500">
            Results from lab analyzers that could not be posted automatically. Nothing here is lost: fix
            the cause and the results are posted. Mappings are managed per analyzer in{" "}
            <Link href="/dashboard/laboratory/lab-settings" className="text-primary underline">
              Lab Settings → Lab Equipments
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              act(retryAllAnalyzerResults(auth), (result) => `Retried ${result.retried}, posted ${result.posted}`)
            }
            className="bg-primary rounded-xl text-white px-4 py-2 text-sm"
          >
            Retry all
          </button>
          <button onClick={load} className="bg-white shadow rounded-xl px-4 py-2 text-sm">
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[
          ["open", "Needs attention"],
          ["posted", "Posted"],
          ["all", "All (30 days)"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setView(value)}
            className={`text-sm rounded px-3 py-1.5 ${view === value ? "bg-primary text-white" : "bg-white shadow"}`}
          >
            {label}
          </button>
        ))}
        <input
          className="ml-auto py-1.5 px-3 rounded bg-white shadow text-sm"
          placeholder="Search sample code"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {!loading && rows.length === 0 ? (
        <div className="bg-white shadow rounded p-8 text-center text-gray-500">
          {view === "open" ? "Nothing waiting. All analyzer results have been posted." : "No results."}
        </div>
      ) : (
        <DataGrid
          dataSource={grouped}
          keyExpr="id"
          showBorders={true}
          showRowLines={true}
          showColumnLines={false}
          wordWrapEnabled={true}
          className="shadow-xl"
        >
          <Grouping autoExpandAll={true} />
          <Paging defaultPageSize={50} />
          <Pager visible={true} showInfo={true} showNavigationButtons={true} />
          <Column
            dataField="run"
            groupIndex={0}
            sortOrder="desc"
            groupCellRender={groupCell}
          />
          <Column dataField="analyzer_code" caption="Code" width={120} />
          <Column
            caption="Value"
            width={160}
            cellRender={({ data }) => (
              <span>
                <span className="font-semibold">{data.value}</span> {data.unit}{" "}
                {data.flag && <span className="text-warning">{data.flag}</span>}
              </span>
            )}
          />
          <Column dataField="test_panel_name" caption="Posted to" width={160} />
          <Column caption="Status" cellRender={statusCell} />
          <Column caption="" width={170} cellRender={actionsCell} />
        </DataGrid>
      )}

      <AssignSampleDialog message={assigning} onClose={() => setAssigning(null)} onAssigned={load} />
      <RawMessageDialog messageId={rawMessageId} onClose={() => setRawMessageId(null)} />
      <AnalyzerMappingsModal
        open={Boolean(mappingEquipment)}
        setOpen={(value) => {
          if (!value) {
            setMappingEquipment(null);
            load();
          }
        }}
        equipment={mappingEquipment}
      />
    </section>
  );
};

export default AnalyzerInbox;

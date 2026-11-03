import React, { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Select from "react-select";
import { toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";

import { useAuth } from "@/assets/hooks/use-auth";
import { fetchLabTestPanels } from "@/redux/service/laboratory";
import {
  createAnalyzerMapping,
  deleteAnalyzerMapping,
  fetchAnalyzerMappings,
  fetchUnmappedAnalyzerCodes,
  updateAnalyzerMapping,
} from "@/redux/service/laboratory/analyzers";

// A mapping with no panel tells the backend to skip the code (histograms,
// scale markers, parameters the lab does not report).
const DONT_IMPORT = { value: "skip", label: "Don't import" };
const panelIdOf = (option) => (option.value === DONT_IMPORT.value ? null : option.value);

const panelOptions = (panels) => {
  const byProfile = {};
  panels.forEach((panel) => {
    const profile = panel.test_profile_name || "No profile";
    (byProfile[profile] = byProfile[profile] || []).push({ value: panel.id, label: panel.name });
  });
  const groups = Object.keys(byProfile)
    .sort()
    .map((profile) => ({
      label: profile,
      options: byProfile[profile].sort((a, b) => a.label.localeCompare(b.label)),
    }));
  return [{ label: "Skip", options: [DONT_IMPORT] }, ...groups];
};

const findOption = (options, panelId) => {
  if (panelId === null) return DONT_IMPORT;
  for (const group of options) {
    const match = group.options.find((option) => option.value === panelId);
    if (match) return match;
  }
  return null;
};

const selectStyles = { menuPortal: (base) => ({ ...base, zIndex: 1500 }) };

const PanelSelect = ({ options, value, onChange, placeholder = "Choose test panel" }) => (
  <Select
    options={options}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    isSearchable
    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
    styles={selectStyles}
  />
);

const AnalyzerMappingsModal = ({ open, setOpen, equipment }) => {
  const auth = useAuth();
  const [panels, setPanels] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [choices, setChoices] = useState({}); // waiting code -> chosen option
  const [newCode, setNewCode] = useState("");
  const [newPanel, setNewPanel] = useState(null);
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => panelOptions(panels), [panels]);

  const load = async () => {
    if (!equipment?.id) return;
    try {
      const [mapped, unmapped] = await Promise.all([
        fetchAnalyzerMappings(auth, equipment.id),
        fetchUnmappedAnalyzerCodes(auth, equipment.id),
      ]);
      setMappings(mapped);
      setWaiting(unmapped);
    } catch (err) {
      toast.error(err);
    }
  };

  useEffect(() => {
    if (!open || !auth) return;
    fetchLabTestPanels(auth).then(setPanels).catch((err) => toast.error(err));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipment?.id]);

  const save = async (code, option) => {
    if (!option) {
      toast.error("Choose a test panel, or Don't import.");
      return;
    }
    setBusy(true);
    try {
      await createAnalyzerMapping(auth, {
        equipment: equipment.id,
        analyzer_code: code,
        test_panel: panelIdOf(option),
      });
      toast.success(
        option.value === DONT_IMPORT.value
          ? `${code} will no longer be imported`
          : `${code} mapped to ${option.label}. Waiting results were posted.`
      );
      await load();
      return true;
    } catch (err) {
      toast.error(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const change = async (mapping, option) => {
    if (!option) return;
    setBusy(true);
    try {
      await updateAnalyzerMapping(auth, mapping.id, { test_panel: panelIdOf(option) });
      toast.success(`${mapping.analyzer_code} updated`);
      await load();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (mapping) => {
    if (!window.confirm(`Remove the mapping for ${mapping.analyzer_code}?`)) return;
    setBusy(true);
    try {
      await deleteAnalyzerMapping(auth, mapping.id);
      await load();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const addManual = async () => {
    const code = newCode.trim();
    if (!code) {
      toast.error("Enter the code the analyzer sends.");
      return;
    }
    if (await save(code, newPanel)) {
      setNewCode("");
      setNewPanel(null);
    }
  };

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-xl font-bold">Test mappings: {equipment?.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Each code this analyzer sends goes to one test panel. Codes named exactly like a requested
              panel are mapped automatically the first time they arrive. You only need to map the rest.
            </p>
          </div>
          <button className="text-sm text-gray-500" onClick={() => setOpen(false)}>Close</button>
        </div>

        {!equipment?.sender_id && (
          <div className="bg-yellow-50 border border-yellow-300 text-sm rounded p-3 my-3">
            This analyzer has no sender ID yet, so its results can&apos;t be told apart from other
            machines. Set it in Edit. The Analyzer Inbox shows the sender of unrecognised messages.
          </div>
        )}

        {waiting.length > 0 && (
          <section className="my-4">
            <h2 className="font-semibold mb-2">
              Waiting for a mapping <span className="text-warning">({waiting.length})</span>
            </h2>
            <p className="text-xs text-gray-500 mb-2">
              Codes this analyzer has sent that are not mapped yet. Their results are held in the
              Analyzer Inbox and are posted as soon as you save a mapping.
            </p>
            <div className="border rounded divide-y">
              {waiting.map((row) => (
                <div key={row.analyzer_code} className="grid grid-cols-12 gap-2 items-center p-2">
                  <div className="col-span-3 font-mono font-semibold">{row.analyzer_code}</div>
                  <div className="col-span-3 text-sm text-gray-600">
                    last: {row.last_value} {row.unit}
                    <span className="block text-xs text-gray-400">{row.count} waiting</span>
                  </div>
                  <div className="col-span-4">
                    <PanelSelect
                      options={options}
                      value={choices[row.analyzer_code] || null}
                      onChange={(option) => setChoices({ ...choices, [row.analyzer_code]: option })}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <button
                      disabled={busy}
                      onClick={() => save(row.analyzer_code, choices[row.analyzer_code])}
                      className="bg-primary rounded-xl text-white text-sm px-4 py-2 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="my-4">
          <h2 className="font-semibold mb-2">Mappings ({mappings.length})</h2>
          {mappings.length === 0 ? (
            <p className="text-sm text-gray-500">No mappings yet.</p>
          ) : (
            <div className="border rounded divide-y">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="grid grid-cols-12 gap-2 items-center p-2">
                  <div className="col-span-3 font-mono">{mapping.analyzer_code}</div>
                  <div className="col-span-8">
                    <PanelSelect
                      options={options}
                      value={findOption(options, mapping.test_panel)}
                      onChange={(option) => change(mapping, option)}
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button disabled={busy} onClick={() => remove(mapping)} title="Remove mapping">
                      <AiFillDelete className="text-warning text-xl" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="my-4">
          <h2 className="font-semibold mb-2">Add a mapping</h2>
          <div className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-3 border rounded-md text-sm border-gray py-2 px-3"
              placeholder="Analyzer code, e.g. HGB"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <div className="col-span-7">
              <PanelSelect options={options} value={newPanel} onChange={setNewPanel} />
            </div>
            <div className="col-span-2 text-right">
              <button
                disabled={busy}
                onClick={addManual}
                className="bg-primary rounded-xl text-white text-sm px-4 py-2 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyzerMappingsModal;

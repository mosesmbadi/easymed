import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import LabNav from "@/components/dashboard/laboratory/LabNav";
import MultiTestProfileSelector from "@/components/common/MultiTestProfileSelector";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllInsurance } from "@/redux/features/insurance";
import { toLocalMediaUrl } from "@/assets/utils/media-url";

const inputClass =
  "block border border-gray rounded-xl py-2 px-3 focus:outline-none w-full text-sm";

// Mirrors laboratory.PatientSample.Condition.
const CONDITIONS = [
  ["acceptable", "Acceptable"],
  ["haemolysed", "Haemolysed"],
  ["clotted", "Clotted"],
  ["lipaemic", "Lipaemic"],
  ["insufficient", "Insufficient volume"],
  ["leaked", "Leaked or broken"],
  ["unlabelled", "Unlabelled or mislabelled"],
  ["wrong_container", "Wrong container"],
  ["delayed", "Delayed in transit"],
];

// <input type="datetime-local"> wants local time without a zone.
const localNow = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};
const toIso = (local) => (local ? new Date(local).toISOString() : null);

let rowSeq = 0;
const emptyRow = () => ({
  key: ++rowSeq,
  // Sent by number only (viral loads by CCC number, trial samples by study ID).
  coded: false,
  first_name: "",
  second_name: "",
  gender: "",
  age_years: "",
  date_of_birth: "",
  external_reference: "",
  referring_doctor: "",
  collected_at: "",
  collected_by: "",
  condition: "acceptable",
  reject: false,
  rejection_reason: "",
  panels: [],
});

const errorLines = (error) => {
  if (!error) return [];
  if (typeof error === "string") return [error];
  if (error.detail) return [String(error.detail)];
  const lines = [];
  const walk = (value, prefix) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) =>
        typeof item === "object" && item !== null
          ? walk(item, prefix === "entries" ? `Patient ${i + 1}` : prefix)
          : lines.push(prefix ? `${prefix}: ${item}` : String(item))
      );
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, v]) =>
        walk(v, key === "non_field_errors" ? prefix : prefix ? `${prefix}, ${key.replace(/_/g, " ")}` : key)
      );
    } else if (value != null) {
      lines.push(prefix ? `${prefix}: ${value}` : String(value));
    }
  };
  walk(error, "");
  return lines;
};

/** One patient off the sending facility's request form. */
const PatientRow = ({ row, index, onChange, onRemove, canRemove }) => {
  const set = (field) => (e) =>
    onChange(row.key, { [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const handleTests = useCallback(
    (sections) => {
      const byId = new Map();
      sections.forEach((s) => s.selectedPanels.forEach((p) => byId.set(p.id, p)));
      onChange(row.key, { panels: [...byId.values()] });
    },
    [row.key, onChange]
  );

  return (
    <section className="bg-white rounded shadow p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Patient {index + 1}</h3>
        {canRemove && (
          <button type="button" className="text-warning text-sm" onClick={() => onRemove(row.key)}>
            Remove
          </button>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={row.coded} onChange={set("coded")} />
        Coded sample: no name on the form, only their number
      </label>
      <div className="grid md:grid-cols-4 grid-cols-1 gap-3">
        {!row.coded && (
          <>
            <input className={inputClass} placeholder="First name" value={row.first_name} onChange={set("first_name")} />
            <input className={inputClass} placeholder="Last name" value={row.second_name} onChange={set("second_name")} />
          </>
        )}
        <select className={inputClass} value={row.gender} onChange={set("gender")}>
          <option value="">Sex</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
        <input
          className={inputClass}
          placeholder={row.coded ? "Their patient / CCC / study no. (required)" : "Their ref / patient no."}
          value={row.external_reference}
          onChange={set("external_reference")}
        />
        <input className={inputClass} type="number" min="0" max="130" placeholder="Age (years)" value={row.age_years} onChange={set("age_years")} />
        <label className="text-xs">
          Date of birth, if on the form
          <input className={inputClass} type="date" value={row.date_of_birth} onChange={set("date_of_birth")} />
        </label>
        <input className={inputClass} placeholder="Requesting clinician" value={row.referring_doctor} onChange={set("referring_doctor")} />
        <input className={inputClass} placeholder="Collected by" value={row.collected_by} onChange={set("collected_by")} />
        <label className="text-xs">
          Collected at
          <input className={inputClass} type="datetime-local" value={row.collected_at} onChange={set("collected_at")} />
        </label>
        <label className="text-xs">
          Condition on arrival
          <select className={inputClass} value={row.condition} onChange={set("condition")}>
            {CONDITIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={row.reject} onChange={set("reject")} />
          Reject: can&apos;t be run, don&apos;t charge the clinic
        </label>
        {row.reject && (
          <input
            className={`${inputClass} md:col-span-4`}
            placeholder="Why, for the clinic (e.g. haemolysed, please redraw)"
            value={row.rejection_reason}
            onChange={set("rejection_reason")}
          />
        )}
      </div>
      <MultiTestProfileSelector onSelectionChange={handleTests} showSummary={false} buttonText="Add Another Test Profile" />
    </section>
  );
};

/**
 * Book in samples another facility sent: who sent them, the request form,
 * and each patient on it. They are billed to the facility's account and go
 * straight to the bench; a rejected sample is not charged, and the facility
 * is told.
 */
const ReceiveSamples = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const { insurance } = useSelector((store) => store.insurance);
  const facilities = useMemo(
    () => (insurance || []).filter((account) => account.account_type === "facility"),
    [insurance]
  );
  const [facility, setFacility] = useState("");
  const [receivedAt, setReceivedAt] = useState(localNow());
  const [courier, setCourier] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState(null);
  const [rows, setRows] = useState([emptyRow()]);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [consignments, setConsignments] = useState([]);

  const loadConsignments = useCallback(() => {
    if (!auth?.token) return;
    fetch("/api/laboratory/referred-samples", { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((resp) => (resp.ok ? resp.json() : []))
      .then(setConsignments)
      .catch(() => {});
  }, [auth?.token]);

  useEffect(() => {
    if (auth) dispatch(getAllInsurance(auth));
    loadConsignments();
  }, [auth?.token]);

  const updateRow = useCallback(
    (key, changes) => setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row))),
    []
  );
  const removeRow = (key) => setRows((prev) => prev.filter((row) => row.key !== key));

  const reset = () => {
    setCourier("");
    setNote("");
    setForm(null);
    setRows([emptyRow()]);
    setReceivedAt(localNow());
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problems = [];
    if (!facility) problems.push("Pick the facility that sent the samples.");
    rows.forEach((row, i) => {
      const who = `Patient ${i + 1}`;
      // Sex and age are taken when the form has them; the report says "Not
      // given" otherwise. A name, or for a coded sample their number, is not optional.
      if (row.coded && !row.external_reference.trim()) {
        problems.push(`${who}: a coded sample needs the facility's number for the patient.`);
      }
      if (!row.coded && (!row.first_name.trim() || !row.second_name.trim())) {
        problems.push(`${who}: give the name on the form, or tick "Coded sample".`);
      }
      if (!row.panels.length) problems.push(`${who}: pick the tests on the form.`);
      if (row.reject && !row.rejection_reason) problems.push(`${who}: say why the sample is rejected.`);
    });
    setErrors(problems);
    if (problems.length) return;

    const entries = rows.map((row) => ({
      new_patient: {
        first_name: row.coded ? "" : row.first_name.trim(),
        second_name: row.coded ? "" : row.second_name.trim(),
        gender: row.gender || null,
        ...(row.date_of_birth
          ? { date_of_birth: row.date_of_birth }
          : row.age_years !== ""
            ? { age_years: Number(row.age_years) }
            : {}),
      },
      external_reference: row.external_reference,
      referring_doctor: row.referring_doctor,
      collected_by: row.collected_by,
      collected_at: toIso(row.collected_at),
      condition: row.condition,
      rejection_reason: row.reject ? row.rejection_reason : "",
      panels: row.panels.map((panel) => panel.id),
    }));
    const body = new FormData();
    body.append("facility", facility);
    body.append("received_at", toIso(receivedAt));
    body.append("courier", courier);
    body.append("note", note);
    if (form) body.append("request_form", form);
    body.append("entries", JSON.stringify(entries));

    setSaving(true);
    try {
      const resp = await fetch("/api/laboratory/referred-samples", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth?.token}` },
        body,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrors(errorLines(data));
        toast.error("Could not book the samples in");
        return;
      }
      const rejected = data.patients.filter((p) => p.rejected).length;
      toast.success(
        `${data.reference}: ${data.patients.length} patient${data.patients.length === 1 ? "" : "s"} booked in` +
          (rejected ? `, ${rejected} rejected` : "")
      );
      reset();
      loadConsignments();
    } catch (error) {
      setErrors(["Could not reach the server."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <LabNav />
      <div className="flex justify-between items-center my-4">
        <h1 className="uppercase text-2xl">Receive Samples</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8" key={formKey}>
        <section className="bg-white rounded shadow p-4 space-y-3">
          <h2 className="font-semibold">Consignment</h2>
          <div className="grid md:grid-cols-4 grid-cols-1 gap-3">
            <select className={inputClass} value={facility} onChange={(e) => setFacility(e.target.value)}>
              <option value="">Sending facility</option>
              {facilities.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <label className="text-xs">
              Received at
              <input className={inputClass} type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </label>
            <input className={inputClass} placeholder="Brought by (courier, rider)" value={courier} onChange={(e) => setCourier(e.target.value)} />
            <label className="text-xs">
              Request form (scan or photo)
              <input className="text-sm" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setForm(e.target.files?.[0] || null)} />
            </label>
          </div>
          {facilities.length === 0 && (
            <p className="text-xs text-warning">
              No referring facilities yet. Add one under Finance &gt; Accounts Receivable &gt; Settings &gt; Credit
              Accounts, with the type Referring facility.
            </p>
          )}
          <textarea className={inputClass} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </section>

        {rows.map((row, index) => (
          <PatientRow
            key={row.key}
            row={row}
            index={index}
            onChange={updateRow}
            onRemove={removeRow}
            canRemove={rows.length > 1}
          />
        ))}

        <div className="flex flex-wrap justify-between gap-2">
          <button
            type="button"
            className="border border-gray rounded-xl px-4 py-2 text-sm"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            Add Another Patient
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white rounded-xl px-6 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Book In Samples"}
          </button>
        </div>

        {errors.length > 0 && (
          <ul className="bg-white rounded shadow p-4 text-sm text-warning list-disc pl-8">
            {errors.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        )}
      </form>

      <section className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Recent consignments</h2>
        {consignments.length === 0 ? (
          <p className="text-sm">None yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-1">Reference</th>
                <th>From</th>
                <th>Received</th>
                <th>Patients</th>
                <th>Rejected</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              {consignments.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-1">{c.reference}</td>
                  <td>{c.facility_name}</td>
                  <td>{new Date(c.received_at).toLocaleString()}</td>
                  <td>{c.patients.map((p) => p.patient_name).join(", ")}</td>
                  <td>{c.patients.filter((p) => p.rejected).length || "-"}</td>
                  <td>
                    {c.request_form ? (
                      <a className="text-primary" href={toLocalMediaUrl(c.request_form)} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Container>
  );
};

ReceiveSamples.getLayout = (page) => (
  <ProtectedRoute permission={"CAN_ACCESS_LABORATORY_DASHBOARD"}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ReceiveSamples;

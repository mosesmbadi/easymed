import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@mui/material";
import AsyncSelect from "react-select/async";
import { toast } from "react-toastify";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import LabNav from "@/components/dashboard/laboratory/LabNav";
import MultiTestProfileSelector from "@/components/common/MultiTestProfileSelector";
import { useAuth } from "@/assets/hooks/use-auth";
import { createWalkInLabRequest, searchWalkInPatients } from "@/redux/service/laboratory";

const inputClass =
  "block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full text-sm";

const emptyPatient = {
  first_name: "",
  second_name: "",
  gender: "",
  date_of_birth: "",
  phone: "",
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// The backend answers a bad request with {field: [messages]}, nested for the
// new patient. Flatten it into lines a person can read.
const errorLines = (error) => {
  if (!error) return [];
  if (typeof error === "string") return [error];
  return Object.entries(error).flatMap(([field, value]) => {
    if (Array.isArray(value)) return value.map(String);
    if (value && typeof value === "object") {
      return Object.entries(value).map(([sub, msgs]) => `${sub.replace(/_/g, " ")}: ${[].concat(msgs).join(" ")}`);
    }
    return field === "non_field_errors" ? [String(value)] : [`${field}: ${value}`];
  });
};

/**
 * Take a walk-in at the lab counter.
 *
 * Pick or register the patient, note who referred them, pick their tests --
 * one call creates the visit on the lab queue with its invoice lines, the same
 * records a doctor's order makes. The patient then pays at the cashier, after
 * which the tests show up under Phlebotomy for collection.
 */
const WalkInLabRequest = () => {
  const auth = useAuth();
  const [mode, setMode] = useState("existing");
  const [existingPatient, setExistingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(emptyPatient);
  const [referringDoctor, setReferringDoctor] = useState("");
  const [referringFacility, setReferringFacility] = useState("");
  const [note, setNote] = useState("");
  const [sections, setSections] = useState([]);
  // Bumped to remount the test picker, which keeps its own state, after a save.
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [created, setCreated] = useState(null);

  const handleSelectionChange = useCallback((next) => setSections(next), []);

  // Two profiles can list the same panel; it is one test and one charge.
  const selectedPanels = useMemo(() => {
    const byId = new Map();
    sections.forEach((section) =>
      section.selectedPanels.forEach((panel) => byId.set(panel.id, panel))
    );
    return [...byId.values()];
  }, [sections]);

  const total = selectedPanels.reduce((sum, panel) => sum + Number(panel.sale_price || 0), 0);
  const unpriced = selectedPanels.filter((panel) => panel.sale_price == null);

  const loadPatients = (input) =>
    input && input.trim().length >= 2
      ? searchWalkInPatients(input, auth)
          .then((rows) =>
            rows.map((p) => ({
              value: p.id,
              label: `${p.name} · ${p.unique_id}${p.age != null ? ` · ${p.age} yrs` : ""}${p.gender ? ` · ${p.gender}` : ""}`,
              patient: p,
            }))
          )
          .catch(() => [])
      : Promise.resolve([]);

  const setPatientField = (field) => (e) =>
    setNewPatient((prev) => ({ ...prev, [field]: e.target.value }));

  const reset = () => {
    setExistingPatient(null);
    setNewPatient(emptyPatient);
    setReferringDoctor("");
    setReferringFacility("");
    setNote("");
    setSections([]);
    setErrors([]);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const problems = [];
    if (mode === "existing" && !existingPatient) problems.push("Pick the patient, or register them as new.");
    if (mode === "new") {
      ["first_name", "second_name", "gender", "date_of_birth"].forEach((field) => {
        if (!newPatient[field]) problems.push(`${field.replace(/_/g, " ")} is required.`);
      });
    }
    if (selectedPanels.length === 0) problems.push("Pick at least one test.");
    if (problems.length) {
      setErrors(problems);
      return;
    }

    const payload = {
      panels: selectedPanels.map((panel) => panel.id),
      referring_doctor: referringDoctor,
      referring_facility: referringFacility,
      note,
      ...(mode === "existing"
        ? { patient: existingPatient.value }
        : { new_patient: newPatient }),
    };

    setSaving(true);
    try {
      const visit = await createWalkInLabRequest(payload, auth);
      setCreated({
        trackNumber: visit.track_number,
        patientName: visit.patient_name,
        total,
        tests: selectedPanels.map((panel) => panel.name),
      });
      toast.success("Walk-in request created");
      reset();
    } catch (error) {
      setErrors(errorLines(error));
      toast.error("Could not create the walk-in request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <LabNav />
      <div className="flex justify-between items-center my-4">
        <h1 className="uppercase text-2xl">New Walk-in</h1>
      </div>

      {created && (
        <section className="bg-white rounded shadow p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm space-y-1">
            <p className="font-semibold">
              {created.patientName} &middot; {created.trackNumber}
            </p>
            <p>{created.tests.join(", ")}</p>
            <p>
              Total: <span className="font-semibold">{money(created.total)}</span>. The
              tests appear under Phlebotomy once paid.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/finance/accounts-receivable/invoices"
              className="bg-primary text-white rounded-xl px-4 py-2 text-sm"
            >
              Take Payment
            </Link>
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="border border-gray rounded-xl px-4 py-2 text-sm"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <section className="bg-white rounded shadow p-4 space-y-3">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Patient</h2>
            <div className="flex gap-2 text-sm">
              {[
                ["existing", "Returning patient"],
                ["new", "New patient"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`${mode === value ? "bg-primary text-white" : "bg-background"} rounded px-3 py-1`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "existing" ? (
            <AsyncSelect
              key={`patient-${formKey}`}
              cacheOptions
              loadOptions={loadPatients}
              value={existingPatient}
              onChange={setExistingPatient}
              isClearable
              placeholder="Search by name, patient number or phone"
              noOptionsMessage={({ inputValue }) =>
                inputValue.trim().length < 2 ? "Type at least two letters" : "No match. Register them as a new patient."
              }
            />
          ) : (
            <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
              <input className={inputClass} placeholder="First name" value={newPatient.first_name} onChange={setPatientField("first_name")} />
              <input className={inputClass} placeholder="Last name" value={newPatient.second_name} onChange={setPatientField("second_name")} />
              <select className={inputClass} value={newPatient.gender} onChange={setPatientField("gender")}>
                <option value="">Sex</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              <label className="text-sm">
                Date of birth
                <input type="date" className={inputClass} value={newPatient.date_of_birth} onChange={setPatientField("date_of_birth")} />
              </label>
              <label className="text-sm">
                Phone (optional)
                <input className={inputClass} value={newPatient.phone} onChange={setPatientField("phone")} />
              </label>
            </div>
          )}
        </section>

        <section className="bg-white rounded shadow p-4 space-y-3">
          <h2 className="font-semibold">Referred by (optional)</h2>
          <div className="grid md:grid-cols-2 grid-cols-1 gap-3">
            <input className={inputClass} placeholder="Referring doctor" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} />
            <input className={inputClass} placeholder="Referring facility" value={referringFacility} onChange={(e) => setReferringFacility(e.target.value)} />
          </div>
          <p className="text-xs">Printed as &ldquo;Requested by&rdquo; on the lab report.</p>
        </section>

        <section className="bg-white rounded shadow p-4 space-y-3">
          <h2 className="font-semibold">Tests</h2>
          <MultiTestProfileSelector
            key={`tests-${formKey}`}
            onSelectionChange={handleSelectionChange}
            showSummary={false}
            buttonText="Add Another Test Profile"
          />
          <textarea
            className={inputClass}
            placeholder="Note for the lab (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        <section className="bg-white rounded shadow p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <p>
              {selectedPanels.length} test{selectedPanels.length === 1 ? "" : "s"} &middot; Total{" "}
              <span className="font-semibold">{money(total)}</span>
            </p>
            {unpriced.length > 0 && (
              <p className="text-warning">
                No price set for {unpriced.map((p) => p.name).join(", ")}. Price it under Lab Settings &gt; Test Panels first.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white rounded-xl px-6 py-2 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Request"}
          </button>
        </section>

        {errors.length > 0 && (
          <ul className="bg-white rounded shadow p-4 text-sm text-warning list-disc pl-8">
            {errors.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        )}
      </form>
    </Container>
  );
};

WalkInLabRequest.getLayout = (page) => (
  <ProtectedRoute permission={"CAN_ACCESS_LABORATORY_DASHBOARD"}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default WalkInLabRequest;

import React from "react";
import Link from "next/link";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import { initiateNewAttendanceProcesses } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { useFacility } from "@/assets/hooks/use-facility";
import AssignDoctorModal from "@/components/dashboard/reception-interface/assign-doctor-modal";
import DirectToTheLabModal from "@/components/dashboard/doctor-desk/DirectToTheLabModal";

const primaryButton = "bg-primary rounded-xl text-sm px-4 py-2 text-white";
const secondaryButton = "border border-gray rounded-xl text-sm px-4 py-2 text-[#02273D]";

/**
 * Start a visit from the Patients list, then say where it goes next. A visit
 * on its own only sits in the reception queue: someone has to send it to a
 * doctor or the lab, and the till has to bill it before either acts on it.
 */
const CreateAppointmentModal = ({ setOpen, open, selectedRowData }) => {
  const [loading, setLoading] = React.useState(false);
  const auth = useAuth();
  const { isModuleEnabled } = useFacility();
  // The visit once started, and where it was sent: null, "doctor" or "lab".
  const [visit, setVisit] = React.useState(null);
  const [sentTo, setSentTo] = React.useState(null);
  const [doctorName, setDoctorName] = React.useState("");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [labOpen, setLabOpen] = React.useState(false);

  const patientName = `${selectedRowData.first_name} ${selectedRowData.second_name}`;
  const billingLink = visit && {
    pathname: "/dashboard/finance/accounts-receivable",
    query: { patient: visit.patient, invoice: visit.invoice },
  };

  const handleClose = () => {
    setOpen(false);
  };

  const initialValues = {
    patient: null,
    reason: "",
  };

  const validationSchema = Yup.object().shape({
    reason: Yup.string().required("Reason for visit required!"),
  });

  const initiateVisit = async (formValue) => {
    setLoading(true)
    try{
      const payload = {
        ...formValue,
        patient: selectedRowData?.id
      }
      const response = await initiateNewAttendanceProcesses(payload, auth)
      toast.success("New Visit Initiated Successfully!")
      setVisit({ ...response, patient_name: patientName })
    }catch(error){
      toast.error("Error Initiating New Visit!")
      handleClose()
    }finally{
      setLoading(false)
    }
  }

  const renderForm = () => (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={initiateVisit}
    >
      <Form>
        <section className="space-y-1">
          <Grid container spacing={2}>
            <Grid item md={12} xs={12}>
              <label className="text-xs font-bold mb-3" htmlFor="reason">Reason For Visiting</label>
              <Field
                as="textarea"
                className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                type="text"
                placeholder="Reason For Visit"
                name="reason"
                rows={8}
              />
              <ErrorMessage
                name="reason"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
          </Grid>

          <div className="flex justify-end gap-2 mt-4">
            <button type="submit" disabled={loading} className={`${primaryButton} disabled:opacity-60`}>
              {loading ? "Starting..." : "New Visit"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="border border-warning rounded-xl text-sm px-4 py-2 text-[#02273D]"
            >
              Cancel
            </button>
          </div>
        </section>
      </Form>
    </Formik>
  );

  const renderNextStep = () => (
    <section className="space-y-4 text-sm">
      <p className="font-semibold">
        Visit started ({visit.track_number}). Where does {selectedRowData.first_name} go next?
      </p>
      <div className="flex flex-wrap gap-2">
        {isModuleEnabled("doctor") && (
          <button type="button" className={primaryButton} onClick={() => setAssignOpen(true)}>
            Send to Doctor
          </button>
        )}
        <button type="button" className={primaryButton} onClick={() => setLabOpen(true)}>
          Send to Lab
        </button>
      </div>
      <p className="text-xs text-gray-600">
        Not sure yet? The visit waits in the{" "}
        <Link href="/dashboard/reception/check-in" className="text-primary underline">
          Check-In queue
        </Link>
        , where reception can send it on later.
      </p>
      <div className="flex justify-end">
        <button type="button" className={secondaryButton} onClick={handleClose}>
          Close
        </button>
      </div>
    </section>
  );

  const renderSent = () => (
    <section className="space-y-4 text-sm">
      {sentTo === "doctor" ? (
        <>
          <p className="font-semibold">
            Sent for triage{doctorName ? `, then to ${doctorName}` : ""}.
          </p>
          <p>
            Next: bill the consultation at the till. The nurse can take vitals
            meanwhile, but the doctor only sees {selectedRowData.first_name} once
            the consultation is billed.
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">Lab tests requested.</p>
          <p>
            Next: bill the tests at the till. They appear under Phlebotomy once billed.
          </p>
        </>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {sentTo === "doctor" && isModuleEnabled("triage") && (
          <Link href="/dashboard/nursing-station" className={secondaryButton}>
            Go to Nursing Station
          </Link>
        )}
        <button type="button" className={secondaryButton} onClick={handleClose}>
          Close
        </button>
        <Link href={billingLink} className={primaryButton}>
          {sentTo === "doctor" ? "Bill Consultation" : "Bill Tests"}
        </Link>
      </div>
    </section>
  );

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle>
          <div className="flex justify-between text-card">
            <p>{patientName}</p>
            <p>{`${selectedRowData.phone}`}</p>
            <p>{`${selectedRowData.gender}`}</p>
          </div>
        </DialogTitle>
        <DialogContent>
          {!visit ? renderForm() : sentTo ? renderSent() : renderNextStep()}
        </DialogContent>
      </Dialog>

      {assignOpen && visit && (
        <AssignDoctorModal
          assignOpen={assignOpen}
          setAssignOpen={setAssignOpen}
          selectedData={visit}
          onAssigned={({ doctor }) => {
            setDoctorName(doctor);
            setSentTo("doctor");
          }}
        />
      )}
      {labOpen && visit && (
        <DirectToTheLabModal
          labOpen={labOpen}
          setLabOpen={setLabOpen}
          selectedData={visit}
          onSent={() => setSentTo("lab")}
        />
      )}
    </section>
  );
};

export default CreateAppointmentModal;

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid, TextField } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { editAppointment } from "@/redux/features/appointment";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";

const RescheduleModal = ({ open, setOpen, appointment }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();

  const initialValues = {
    appointment_date: appointment ? dayjs(appointment.appointment_date) : dayjs(),
    notes: appointment?.notes || "",
  };

  const validationSchema = Yup.object().shape({
    appointment_date: Yup.date().required("Date and time are required"),
  });

  const handleSubmit = async (values, { resetForm }) => {
    setLoading(true);
    const payload = {
      patient: appointment.patient,
      doctor: appointment.doctor,
      appointment_date: values.appointment_date.toISOString(),
      notes: values.notes,
    };
    try {
      await dispatch(editAppointment(appointment.id, payload, auth));
      toast.success("Appointment rescheduled");
      resetForm();
      handleClose();
    } catch (error) {
      toast.error("Failed to reschedule");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
      <DialogTitle>Reschedule Appointment</DialogTitle>
      <DialogContent>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue }) => (
            <Form>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <DateTimePicker
                    label="New Appointment Date & Time"
                    value={values.appointment_date}
                    onChange={(newValue) => setFieldValue("appointment_date", newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                  <ErrorMessage name="appointment_date" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary px-4 rounded-xl text-sm py-2 text-white"
                >
                  {loading && "Loading..."}
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="border border-warning rounded-xl text-sm px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleModal;
import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { addAppointment } from "@/redux/features/appointment";
import { toast } from "react-toastify";
import api from "@/utils/api"; // ✅ Use the stable api instance

const BookAppointmentModal = ({ open, setOpen, patient }) => {
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!open) return;
    const fetchDoctors = async () => {
      try {
        const response = await api.get('/users/doctors/');
        const allUsers = Array.isArray(response.data) 
          ? response.data 
          : response.data?.results || [];
        
        const doctorsList = allUsers.filter(u => u.role === 'doctor');
        
        console.log('All users from API:', allUsers.map(u => ({ id: u.id, role: u.role })));
        console.log('Filtered doctors (role === "doctor"):', doctorsList.map(d => ({ id: d.id, name: d.first_name, role: d.role })));

        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
        
        const uniqueSpecialties = [...new Set(doctorsList.map(d => d.profession).filter(Boolean))];
        setSpecialties(uniqueSpecialties);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
        toast.error("Could not load doctors");
      }
    };
    fetchDoctors();
  }, [open]); // ✅ only depends on open

  const handleSpecialtyChange = (specialty) => {
    if (specialty === "") {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(d => d.profession === specialty);
      setFilteredDoctors(filtered);
    }
  };

  const initialValues = {
    specialty: "",
    doctor: "",
    appointment_date: dayjs(),
    notes: "",
  };

  const validationSchema = Yup.object().shape({
    doctor: Yup.string().required("Doctor is required"),
    appointment_date: Yup.date().required("Date and time are required"),
  });

  const handleSubmit = async (values, { resetForm }) => {
    setLoading(true);
    const doctorId = parseInt(values.doctor, 10);
    const selectedDoctor = filteredDoctors.find(d => d.id === doctorId);
    if (!selectedDoctor) {
      toast.error("Selected doctor is not valid");
      setLoading(false);
      return;
    }
    const payload = {
      patient: patient.id,
      doctor: doctorId,
      appointment_date: values.appointment_date.toISOString(),
      notes: values.notes,
    };
    console.log('Submitting appointment with payload:', payload);
    try {
      await dispatch(addAppointment(payload)); // ✅ no auth parameter
      toast.success("Appointment booked successfully");
      resetForm();
      setFilteredDoctors([]);
      handleClose();
    } catch (error) {
      console.error("Failed to book appointment", error);
      if (error.response) {
        toast.error(`Error: ${JSON.stringify(error.response.data)}`);
      } else {
        toast.error("Failed to book appointment");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={handleClose}>
      <DialogTitle>Book Appointment for {patient?.first_name} {patient?.second_name}</DialogTitle>
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
                  <FormControl fullWidth>
                    <InputLabel>Doctor Category</InputLabel>
                    <Select
                      name="specialty"
                      value={values.specialty}
                      onChange={(e) => {
                        setFieldValue("specialty", e.target.value);
                        setFieldValue("doctor", "");
                        handleSpecialtyChange(e.target.value);
                      }}
                      label="Doctor Category"
                    >
                      <MenuItem value="">All Doctors</MenuItem>
                      {specialties.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                    <ErrorMessage name="specialty" component="div" className="text-warning text-xs" />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Doctor</InputLabel>
                    <Select
                      name="doctor"
                      value={values.doctor}
                      onChange={(e) => setFieldValue("doctor", e.target.value)}
                      label="Preferred Doctor"
                    >
                      {filteredDoctors.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.first_name} {d.last_name} {d.profession && `(${d.profession})`}
                        </MenuItem>
                      ))}
                    </Select>
                    <ErrorMessage name="doctor" component="div" className="text-warning text-xs" />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <DateTimePicker
                    label="Appointment Date & Time"
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
                  Book Appointment
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

export default BookAppointmentModal;
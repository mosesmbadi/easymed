import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Autocomplete, 
  Grid, 
  Typography, 
  Collapse,
  Alert,
  MenuItem,
  Divider,
  ButtonGroup,
  Chip
} from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { createPatient, initiateNewAttendanceProcesses } from '@/redux/service/patients';
import { getAllInsurance } from '@/redux/features/insurance';
import { getAllPatients, getAllProcesses } from '@/redux/features/patients';
import { MdPersonAdd, MdPersonSearch } from 'react-icons/md';
import { IoMdCheckmarkCircle } from 'react-icons/io';
import AssignDoctorModal from '../reception-interface/assign-doctor-modal';
import DirectToTheLabModal from '../doctor-desk/DirectToTheLabModal';

const UnifiedCheckInForm = ({ onSuccess }) => {
  const [mode, setMode] = useState('search'); // 'search' or 'register'
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitCreated, setVisitCreated] = useState(false);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assignDoctorOpen, setAssignDoctorOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  
  const dispatch = useDispatch();
  const auth = useAuth();
  const { patients } = useSelector((store) => store.patient);
  const { insurance } = useSelector((store) => store.insurance);

  useEffect(() => {
    dispatch(getAllInsurance(auth));
    dispatch(getAllPatients(auth));
  }, []);

  // Patient Registration Schema
  const registerSchema = Yup.object().shape({
    first_name: Yup.string().required('First name required'),
    second_name: Yup.string().required('Last name required'),
    date_of_birth: Yup.date().required('Date of birth required').max(new Date(), 'Cannot be future date'),
    gender: Yup.string().required('Gender required'),
    phone: Yup.string().required('Phone required'),
    email: Yup.string().email('Invalid email'),
    unique_id: Yup.string().required('ID number required'),
  });

  // Visit Creation Schema
  const visitSchema = Yup.object().shape({
    reason: Yup.string().required('Reason for visit required'),
  });

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setVisitCreated(false);
    setCurrentProcess(null);
  };

  const handleRegisterPatient = async (values, { resetForm }) => {
    setLoading(true);
    try {
      const patientPayload = {
        first_name: values.first_name,
        second_name: values.second_name,
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        phone: values.phone,
        email: values.email,
        insurances: values.insurances || [],
        unique_id: values.unique_id,
      };

      const response = await createPatient(patientPayload, auth);
      toast.success('Patient registered successfully!');
      
      // Refresh patients list
      dispatch(getAllPatients(auth));
      
      // Set the newly created patient as selected
      setSelectedPatient(response);
      setMode('search');
      resetForm();
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error(error?.response?.data?.message || 'Error registering patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisit = async (values, { resetForm }) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient: selectedPatient.id,
        reason: values.reason,
      };

      const response = await initiateNewAttendanceProcesses(payload, auth);
      toast.success('Visit created successfully!');
      
      setVisitCreated(true);
      setCurrentProcess(response);
      resetForm();
      
      // Refresh processes
      dispatch(getAllProcesses(auth));
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating visit:', error);
      toast.error('Error creating visit');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToDoctor = () => {
    if (!currentProcess) return;
    const processData = {
      ...currentProcess,
      patient_name: `${selectedPatient.first_name} ${selectedPatient.second_name}`
    };
    setCurrentProcess(processData);
    setAssignDoctorOpen(true);
  };

  const handleSendToLab = () => {
    if (!currentProcess) return;
    const processData = {
      ...currentProcess,
      patient_name: `${selectedPatient.first_name} ${selectedPatient.second_name}`
    };
    setCurrentProcess(processData);
    setLabModalOpen(true);
  };

  const handleActionComplete = () => {
    // Reset the form for next patient
    setSelectedPatient(null);
    setVisitCreated(false);
    setCurrentProcess(null);
    dispatch(getAllProcesses(auth));
    if (onSuccess) onSuccess();
  };

  return (
    <Box>
      {/* Mode Toggle */}
      <ButtonGroup fullWidth sx={{ mb: 3 }}>
        <Button
          variant={mode === 'search' ? 'contained' : 'outlined'}
          onClick={() => setMode('search')}
          startIcon={<MdPersonSearch />}
        >
          Search Patient
        </Button>
        <Button
          variant={mode === 'register' ? 'contained' : 'outlined'}
          onClick={() => setMode('register')}
          startIcon={<MdPersonAdd />}
        >
          New Patient
        </Button>
      </ButtonGroup>

      {/* Search Mode */}
      {mode === 'search' && (
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            options={patients}
            getOptionLabel={(option) => 
              `${option.first_name} ${option.second_name} - ${option.phone} (${option.patient_number})`
            }
            onChange={(event, value) => handlePatientSelect(value)}
            value={selectedPatient}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Patient"
                placeholder="Search by name, phone, or ID..."
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">
                    {option.first_name} {option.second_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.phone} • {option.gender} • ID: {option.patient_number}
                  </Typography>
                </Box>
              </li>
            )}
          />
        </Box>
      )}

      {/* Register Mode */}
      {mode === 'register' && (
        <Formik
          initialValues={{
            first_name: '',
            second_name: '',
            date_of_birth: '',
            gender: '',
            phone: '',
            email: '',
            unique_id: '',
            insurances: [],
          }}
          validationSchema={registerSchema}
          onSubmit={handleRegisterPatient}
        >
          {({ errors, touched, values, setFieldValue }) => (
            <Form>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="first_name"
                    label="First Name *"
                    error={touched.first_name && !!errors.first_name}
                    helperText={touched.first_name && errors.first_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="second_name"
                    label="Last Name *"
                    error={touched.second_name && !!errors.second_name}
                    helperText={touched.second_name && errors.second_name}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="date_of_birth"
                    label="Date of Birth *"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={touched.date_of_birth && !!errors.date_of_birth}
                    helperText={touched.date_of_birth && errors.date_of_birth}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    select
                    name="gender"
                    label="Gender *"
                    error={touched.gender && !!errors.gender}
                    helperText={touched.gender && errors.gender}
                  >
                    <MenuItem value="M">Male</MenuItem>
                    <MenuItem value="F">Female</MenuItem>
                    <MenuItem value="O">Other</MenuItem>
                  </Field>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="phone"
                    label="Phone Number *"
                    error={touched.phone && !!errors.phone}
                    helperText={touched.phone && errors.phone}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="unique_id"
                    label="ID/Passport Number *"
                    error={touched.unique_id && !!errors.unique_id}
                    helperText={touched.unique_id && errors.unique_id}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="email"
                    label="Email"
                    type="email"
                    error={touched.email && !!errors.email}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={insurance}
                    getOptionLabel={(option) => option.name}
                    onChange={(event, value) => setFieldValue('insurances', value.map(v => v.id))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Insurance Companies"
                        placeholder="Select insurance..."
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    size="large"
                  >
                    {loading ? 'Registering...' : 'Register Patient'}
                  </Button>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      )}

      {/* Selected Patient Info */}
      {selectedPatient && mode === 'search' && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Selected Patient
          </Typography>
          <Typography variant="h6">
            {selectedPatient.first_name} {selectedPatient.second_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedPatient.gender} • {selectedPatient.phone} • ID: {selectedPatient.patient_number}
          </Typography>
        </Box>
      )}

      {/* Visit Creation Form */}
      {selectedPatient && !visitCreated && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Create Visit
          </Typography>
          <Formik
            initialValues={{ reason: '' }}
            validationSchema={visitSchema}
            onSubmit={handleCreateVisit}
          >
            {({ errors, touched }) => (
              <Form>
                <Field
                  as={TextField}
                  fullWidth
                  multiline
                  rows={4}
                  name="reason"
                  label="Reason for Visit *"
                  placeholder="Enter the reason for the patient's visit..."
                  error={touched.reason && !!errors.reason}
                  helperText={touched.reason && errors.reason}
                  sx={{ mb: 2 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  size="large"
                  color="success"
                >
                  {loading ? 'Creating Visit...' : 'Check In Patient'}
                </Button>
              </Form>
            )}
          </Formik>
        </>
      )}

      {/* Action Buttons After Visit Created */}
      {visitCreated && currentProcess && (
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity="success" 
            icon={<IoMdCheckmarkCircle />}
            sx={{ mb: 2 }}
          >
            Patient checked in successfully! Choose next action:
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleSendToDoctor}
                sx={{ py: 1.5 }}
              >
                Send to Doctor
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleSendToLab}
                sx={{ py: 1.5 }}
              >
                Send to Lab
              </Button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSelectedPatient(null);
                  setVisitCreated(false);
                  setCurrentProcess(null);
                }}
                sx={{ py: 1.5 }}
              >
                Next Patient
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Modals */}
      {assignDoctorOpen && currentProcess && (
        <AssignDoctorModal
          assignOpen={assignDoctorOpen}
          setAssignOpen={setAssignDoctorOpen}
          selectedData={currentProcess}
        />
      )}

      {labModalOpen && currentProcess && (
        <DirectToTheLabModal
          labOpen={labModalOpen}
          setLabOpen={setLabModalOpen}
          selectedData={currentProcess}
        />
      )}
    </Box>
  );
};

export default UnifiedCheckInForm;

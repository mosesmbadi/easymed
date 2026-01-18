import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { MoreVert, PersonAdd, LocalHospital, Science, Medication } from '@mui/icons-material';
import { format } from 'date-fns';
import AssignDoctorModal from '../reception-interface/assign-doctor-modal';
import DirectToTheLabModal from '../doctor-desk/DirectToTheLabModal';
import { updateAttendanceProcesses } from '@/redux/service/patients';
import { useAuth } from '@/assets/hooks/use-auth';
import { toast } from 'react-toastify';

const CheckedInPatientsQueue = ({ processes, patients, onUpdate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [assignDoctorOpen, setAssignDoctorOpen] = useState(false);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const auth = useAuth();

  const handleMenuOpen = (event, process) => {
    const patient = patients.find(p => p.id === process.patient);
    const processWithPatient = {
      ...process,
      patient_name: patient ? `${patient.first_name} ${patient.second_name}` : 'Unknown'
    };
    setSelectedProcess(processWithPatient);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSendToDoctor = () => {
    setAssignDoctorOpen(true);
    handleMenuClose();
  };

  const handleSendToLab = () => {
    setLabModalOpen(true);
    handleMenuClose();
  };

  const handleSendToPharmacy = async () => {
    try {
      await updateAttendanceProcesses({ track: 'pharmacy' }, selectedProcess.id, auth);
      toast.success('Patient sent to pharmacy');
      handleMenuClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error sending to pharmacy:', error);
      toast.error('Error sending patient to pharmacy');
    }
  };

  const handleActionComplete = () => {
    if (onUpdate) onUpdate();
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.second_name}` : 'Unknown';
  };

  const getPatientDetails = (patientId) => {
    return patients.find(p => p.id === patientId);
  };

  const getTrackColor = (track) => {
    const colors = {
      reception: 'default',
      triage: 'warning',
      doctor: 'primary',
      lab: 'success',
      pharmacy: 'info',
    };
    return colors[track] || 'default';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, HH:mm');
    } catch {
      return 'Invalid Date';
    }
  };

  const getWaitingTime = (createdAt) => {
    if (!createdAt) return 'N/A';
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMinutes = Math.floor((now - created) / 1000 / 60);
      
      if (diffMinutes < 60) {
        return `${diffMinutes} mins`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
      }
    } catch {
      return 'N/A';
    }
  };

  if (!processes || processes.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No patients in queue
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>#</strong></TableCell>
              <TableCell><strong>Patient</strong></TableCell>
              <TableCell><strong>Patient ID</strong></TableCell>
              <TableCell><strong>Reason</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Check-In Time</strong></TableCell>
              <TableCell><strong>Waiting</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {processes.map((process, index) => {
              const patient = getPatientDetails(process.patient);
              return (
                <TableRow key={process.id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {getPatientName(process.patient)}
                    </Typography>
                    {patient && (
                      <Typography variant="caption" color="text.secondary">
                        {patient.gender} • {patient.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={process.patient_number || 'N/A'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={process.reason || 'No reason provided'}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {process.reason || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={process.track?.toUpperCase() || 'UNKNOWN'} 
                      size="small" 
                      color={getTrackColor(process.track)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {formatDateTime(process.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getWaitingTime(process.created_at)} 
                      size="small"
                      color={getWaitingTime(process.created_at).includes('h') ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, process)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleSendToDoctor}>
          <ListItemIcon>
            <LocalHospital fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Send to Doctor</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSendToLab}>
          <ListItemIcon>
            <Science fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Send to Lab</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSendToPharmacy}>
          <ListItemIcon>
            <Medication fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText>Send to Pharmacy</ListItemText>
        </MenuItem>
      </Menu>

      {/* Modals */}
      {assignDoctorOpen && selectedProcess && (
        <AssignDoctorModal
          assignOpen={assignDoctorOpen}
          setAssignOpen={setAssignDoctorOpen}
          selectedData={selectedProcess}
        />
      )}

      {labModalOpen && selectedProcess && (
        <DirectToTheLabModal
          labOpen={labModalOpen}
          setLabOpen={setLabModalOpen}
          selectedData={selectedProcess}
        />
      )}
    </>
  );
};

export default CheckedInPatientsQueue;

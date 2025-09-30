import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { FaRobot } from 'react-icons/fa';
import { APP_API_URL } from '@/assets/api-endpoints';
import UseAxios from '@/assets/hooks/use-axios';
import { useAuth } from '@/assets/hooks/use-auth';
import { toast } from 'react-toastify';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 12,
    minWidth: '500px',
    maxWidth: '700px',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const ResponsePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: 8,
  marginTop: theme.spacing(2),
}));

const AITriageModal = ({ open, setOpen, selectedRowData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [error, setError] = useState(null);
  const [hasRequested, setHasRequested] = useState(false);
  const auth = useAuth();

  const handleClose = () => {
    setOpen(false);
    setAiResponse(null);
    setError(null);
    setHasRequested(false);
    setIsLoading(false);
  };

  const handleAskAI = async () => {
    if (!selectedRowData?.patient) {
      toast.error('No patient selected');
      return;
    }

    setIsLoading(true);
    setError('');
    setAiResponse(null);

    const axiosInstance = UseAxios(auth);

    try {
      console.log('Making POST request to:', APP_API_URL.AI_TRIAGE_REQUEST);
      console.log('Auth token:', auth?.token ? 'Present' : 'Missing');
      
      const response = await axiosInstance.post(
        APP_API_URL.AI_TRIAGE_REQUEST,
        {
          patient_id: selectedRowData.patient
        }
      );

      toast.success('AI analysis started! Please wait...');
      
      // Start polling for results
      pollForResults(selectedRowData.patient, axiosInstance);
      
    } catch (err) {
      console.error('Error starting AI analysis:', err);
      setError('Failed to start AI analysis');
      setIsLoading(false);
      toast.error('Failed to start AI analysis');
    }
  };

      const pollForResults = async (patientId, axiosInstance, attempts = 0) => {
    const maxAttempts = 20; // 20 attempts with 3 second intervals = 1 minute max
    
    if (attempts >= maxAttempts) {
      setError('AI analysis is taking longer than expected. Please try again later.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.get(
        `${APP_API_URL.AI_TRIAGE_RESULTS}?patient_id=${patientId}`
      );

      const result = response.data;
      
      if (result.status === 'completed') {
        setAiResponse(result);
        setIsLoading(false);
        toast.success('AI analysis completed successfully!');
      } else if (result.status === 'error') {
        setError(result.predicted_condition || 'AI analysis failed');
        setIsLoading(false);
      } else {
        // Still processing, poll again after 3 seconds
        setTimeout(() => pollForResults(patientId, axiosInstance, attempts + 1), 3000);
      }
    } catch (err) {
      if (err.response?.status === 404 || attempts < 3) {
        // Result not ready yet, continue polling
        setTimeout(() => pollForResults(patientId, axiosInstance, attempts + 1), 3000);
      } else {
        console.error('Error fetching AI results:', err);
        setError('Failed to fetch AI analysis results');
        setIsLoading(false);
      }
    }
  };

  const formatResponse = (text) => {
    // Split by double newlines to create paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => (
      <Typography key={index} variant="body1" sx={{ mb: 1 }}>
        {paragraph}
      </Typography>
    ));
  };

  const getPatientName = () => {
    if (selectedRowData?.patient_name) {
      return selectedRowData.patient_name;
    }
    return 'Unknown Patient';
  };

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <StyledDialogTitle>
        <FaRobot size={24} />
        AI Triage Analysis - {getPatientName()}
      </StyledDialogTitle>
      
      <DialogContent sx={{ py: 3 }}>
        {!hasRequested ? (
          <Box textAlign="center" py={2}>
            <FaRobot size={48} color="#667eea" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              AI-Powered Medical Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Our AI will analyze this patient&apos;s medical history, triage records, and consultation notes 
              to provide diagnostic insights and recommendations.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              This analysis will review the patient&apos;s recent medical records and may take up to 1 minute to complete.
            </Alert>
          </Box>
        ) : isLoading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress size={60} sx={{ color: '#667eea', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              AI is Thinking...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analyzing patient data and generating insights
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label="Processing medical history" variant="outlined" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Reviewing triage data" variant="outlined" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Generating recommendations" variant="outlined" sx={{ mb: 1 }} />
            </Box>
          </Box>
        ) : error ? (
          <Box>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Analysis Failed
              </Typography>
              {error}
            </Alert>
          </Box>
        ) : aiResponse ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Analysis completed successfully!
            </Alert>
            
            <ResponsePaper>
              <Typography variant="h6" gutterBottom sx={{ color: '#667eea', display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaRobot /> AI Medical Analysis
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                {formatResponse(aiResponse.predicted_condition)}
              </Box>
              
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="caption" color="text.secondary">
                  Analysis completed on: {new Date(aiResponse.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </ResponsePaper>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="caption">
                <strong>Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical judgment. 
                Always consult with qualified healthcare professionals for medical decisions.
              </Typography>
            </Alert>
          </Box>
        ) : null}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!hasRequested ? (
          <>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button 
              onClick={handleAskAI} 
              variant="contained" 
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                }
              }}
              startIcon={<FaRobot />}
            >
              Ask AI
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleClose} 
            variant="contained" 
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            Close
          </Button>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

export default AITriageModal;
import React from 'react'
import { useDispatch  } from 'react-redux';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';

import { useAuth } from '@/assets/hooks/use-auth';
import TestResultsPanels from '../../laboratory/TestResultsItems';
const TestResultsModal = ({setResultOpen, resultOpen, selectedData}) => {

    const handleClose = () => {
        setResultOpen(false);
    };


  return (
    <div>
        <Dialog
            fullWidth
            maxWidth="md"
            open={resultOpen}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
            </DialogTitle>
            <DialogContent>
                <TestResultsPanels test={selectedData?.id} />
            </DialogContent>
        </Dialog>      
    </div>
  )
}

export default TestResultsModal
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Container, Grid, FormGroup } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';

import { getAllPatients } from "@/redux/features/patients";
import { getAllInvoices, getPaymentModes } from "@/redux/features/billing";

import LabTestRequests from './lab-test-requests';
import PrescribedDrug from './prescribed-drug';
import Appointments from './Appointments';
import ReviewInvoice from './ReviewInvoice';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllInvoiceItemsByInvoiceId, getPatientInvoices } from '@/redux/features/billing';

const NewInvoice = () => {
    const dispatch = useDispatch()
    const auth = useAuth();
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedAppointments, setSelectedAppointments] = useState([]);
    const [selectedLabRequests, setSelectedLabRequests] = useState([]);
    const [selectedPrescribedDrugs, setSelectedPrescribedDrugs] = useState([]);
    const [patient, setPatient] = useState(null)

    const { patients } = useSelector((store) => store.patient);
    const { invoices, allInvoices } = useSelector((store) => store.billing)

    // Get unique patients from pending invoices
    const patientsWithPendingInvoices = React.useMemo(() => {
        if (!allInvoices || !patients) return [];
        
        // Get pending invoices
        const pendingInvoices = allInvoices.filter(invoice => invoice.status === 'pending');
        
        // Get unique patient IDs from pending invoices
        const patientIds = [...new Set(pendingInvoices.map(invoice => invoice.patient))];
        
        // Match with patient details
        const patientsWithDetails = patientIds.map(patientId => {
            return patients.find(patient => patient.id === patientId);
        }).filter(Boolean); // Remove undefined entries
        
        return patientsWithDetails;
    }, [allInvoices, patients]);


    const handleChange = (selectedOption) => {
      if (selectedOption){
        setSelectedOption(selectedOption);
        dispatch(getPatientInvoices(auth, selectedOption?.value))
        const selectedPatient = _.find(patients, { id: selectedOption?.value });
        setPatient(selectedPatient);
      }else{
        setSelectedOption(selectedOption);
        setPatient(null);
        setSelectedInvoice(null);
      }

    };

    function formatDate(date) {
      const d = new Date(date);
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      const year = d.getFullYear();
    
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
    
      return [month, day, year].join('/');
    }

    useEffect(() => {
        if (auth) {
            // Pass empty filter parameters to get all patients and invoices
            const emptyProcessFilter = { search: "" };
            const emptySearchFilter = { label: "", value: "" };
            dispatch(getAllPatients(auth, emptyProcessFilter, emptySearchFilter));
            dispatch(getAllInvoices(auth, emptyProcessFilter, emptySearchFilter));
        }
    }, [auth]);

    const selectInvoice = (invoice)=> {
      setSelectedInvoice(invoice)
      dispatch(getAllInvoiceItemsByInvoiceId(auth, invoice.id))
    }

      useEffect(() => {
          if (auth) {
              dispatch(getPaymentModes(auth));
          }
      }, [auth]);

  return (
    <Grid container spacing={2}>
      <Grid className='' item md={3} xs={12}>
          <Grid className='my-2' item md={12} xs={12}>
            <h2 className='text-xl rounded-lg text-primary'>Select A Patient</h2>
            <Select
                  value={selectedOption}
                  isSearchable
                  isClearable
                  onChange={handleChange}
                  options={patientsWithPendingInvoices.map((patient) => ({ value: patient.id, label: `${patient.first_name} ${patient.second_name}` }))}
                  placeholder="Select a patient with pending invoices..."
                  noOptionsMessage={() => "No patients with pending invoices found"}
              />
          </Grid>

          {selectedOption ? (
            <Grid className='w-full min-h-[60vh] bg-white rounded-lg mt-2' item md={12} xs={12}>
              <Container className='py-4' maxWidth="xl">
                <Grid item md={12} xs={4}>
                    <h2 className='font-bold text-primary'>Invoices</h2>
                </Grid>
                <ul className='py-4'>
                  {invoices.map((invoice) => {
                    const date = invoice.invoice_created_at
                    return (
                      <li onClick={()=> selectInvoice(invoice)} className={`my-2 p-1 cursor-pointer  ${selectedInvoice?.id === invoice.id ? "bg-primary text-white" : ""}`} key={invoice.id}>
                        {invoice.invoice_date}
                      </li>
                      )
                  })}
                </ul>
              </Container>
            </Grid>
          ): 
          <Grid item md={12} xs={12} className='my-2 h-[60vh] text-center items-center bg-white justify-center flex'>
            <h2 className='text-2xl'> No Patient is Selected </h2>
          </Grid>
          }

          
      </Grid>
      <Grid className='h-[80vh]' item md={9} xs={12}>
        {selectedOption && selectedInvoice && (
          <ReviewInvoice 
            selectedOption={selectedOption}
            selectedInvoice={selectedInvoice}
            selectedPatient={patient} 
            selectedAppointments={selectedAppointments} 
            selectedLabRequests={selectedLabRequests}
            selectedPrescribedDrugs={selectedPrescribedDrugs}
            setSelectedAppointments={setSelectedAppointments}
            setSelectedPrescribedDrugs={setSelectedPrescribedDrugs}
            setSelectedLabRequests={setSelectedLabRequests}
          />
        )}
      </Grid>

    </Grid>
  )
}

export default NewInvoice
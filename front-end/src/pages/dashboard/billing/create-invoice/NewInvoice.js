import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Container, Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';

import { getPaymentModes } from "@/redux/features/billing";
import { fetchInvoices } from "@/redux/service/billing";
import { fetchPatientById } from "@/redux/service/patients";

import ReviewInvoice from './ReviewInvoice';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllInvoiceItemsByInvoiceId, getPatientInvoices } from '@/redux/features/billing';

const NewInvoice = () => {
    const dispatch = useDispatch()
    const auth = useAuth();
    const router = useRouter();
    // ?patient=&invoice= (from the walk-in screen) opens that bill directly, once.
    const openedFromLink = React.useRef(false);
    const invoiceFromLink = React.useRef(null);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [selectedAppointments, setSelectedAppointments] = useState([]);
    const [selectedLabRequests, setSelectedLabRequests] = useState([]);
    const [selectedPrescribedDrugs, setSelectedPrescribedDrugs] = useState([]);
    const [patient, setPatient] = useState(null)
    // Only invoices still owed: the dropdown lists who has one. Loading every
    // invoice and every patient to work that out took over a minute.
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [loadingPending, setLoadingPending] = useState(true);

    const { invoices: fetchedInvoices } = useSelector((store) => store.billing)
    // The store is shared with other billing screens: show only this patient's.
    const invoices = fetchedInvoices.filter((invoice) => invoice.patient === selectedOption?.value);

    const patientOptions = React.useMemo(() => {
        const seen = new Map();
        pendingInvoices.forEach((invoice) => {
            if (invoice.patient && !seen.has(invoice.patient)) {
                seen.set(invoice.patient, {
                    value: invoice.patient,
                    label: invoice.patient_full_name || invoice.patient_name,
                });
            }
        });
        return [...seen.values()];
    }, [pendingInvoices]);

    const handleChange = (selectedOption) => {
      invoiceFromLink.current = null;
      if (selectedOption){
        setSelectedOption(selectedOption);
        setSelectedInvoice(null);
        setPatient(null);
        setLoadingInvoices(true);
        Promise.resolve(dispatch(getPatientInvoices(auth, selectedOption?.value, 'pending')))
          .finally(() => setLoadingInvoices(false));
        // Their insurances decide which payment modes the lines can use.
        fetchPatientById(selectedOption.value, auth)
          .then(setPatient)
          .catch(() => setPatient({ id: selectedOption.value, insurances: [] }));
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
        if (!auth) return;
        setLoadingPending(true);
        fetchInvoices(auth, { search: "" }, { label: "", value: "" }, 'pending')
          .then((data) => setPendingInvoices(Array.isArray(data) ? data : []))
          .catch(() => setPendingInvoices([]))
          .finally(() => setLoadingPending(false));
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

    useEffect(() => {
        if (openedFromLink.current || loadingPending || !router.isReady) return;
        openedFromLink.current = true;
        const option = patientOptions.find((o) => o.value === Number(router.query.patient));
        if (option) {
            handleChange(option);
            invoiceFromLink.current = Number(router.query.invoice) || null;
        }
    }, [router.isReady, loadingPending, patientOptions]);

    useEffect(() => {
        if (!invoiceFromLink.current) return;
        const match = invoices.find((invoice) => invoice.id === invoiceFromLink.current);
        if (match) {
            invoiceFromLink.current = null;
            selectInvoice(match);
        }
    }, [fetchedInvoices, selectedOption]);

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
                  options={patientOptions}
                  isLoading={loadingPending}
                  placeholder={loadingPending ? "Loading patients with unpaid invoices..." : "Select a patient with unpaid invoices..."}
                  noOptionsMessage={() => loadingPending ? "Loading..." : "No patients with unpaid invoices"}
              />
          </Grid>

          {selectedOption ? (
            <Grid className='w-full min-h-[60vh] bg-white rounded-lg mt-2' item md={12} xs={12}>
              <Container className='py-4' maxWidth="xl">
                <Grid item md={12} xs={4}>
                    <h2 className='font-bold text-primary'>Invoices</h2>
                </Grid>
                <ul className='py-4'>
                  {invoices.length === 0 && (
                    <li className='text-sm text-gray-500'>
                      {loadingInvoices ? 'Loading invoices...' : 'No unpaid invoices for this patient.'}
                    </li>
                  )}
                  {invoices.map((invoice) => (
                    <li onClick={()=> selectInvoice(invoice)} className={`my-2 p-1 cursor-pointer text-sm ${selectedInvoice?.id === invoice.id ? "bg-primary text-white" : ""}`} key={invoice.id}>
                      <span className='block font-semibold'>{invoice.invoice_number}</span>
                      <span className='block'>{invoice.invoice_date} &middot; {Number(invoice.invoice_amount || 0).toLocaleString()}</span>
                    </li>
                  ))}
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
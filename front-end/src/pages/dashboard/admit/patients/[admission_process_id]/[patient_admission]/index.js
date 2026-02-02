import React, { useEffect, useState } from 'react'

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getOneProcess } from '@/redux/features/patients';
import { Container } from '@mui/material';
import AdmitNav from '@/components/dashboard/admit/AdmitNav';
import AdmittedPatientDetails from '@/components/dashboard/admit/AdmittedPatientDetails';
import AdmittedTests from '@/components/dashboard/admit/AdmittedTests';
import AdmittedPrescription from '@/components/dashboard/admit/AdmittedPrescription';
import AdmissionDetails from '@/components/dashboard/admit/AdmissionDetails';
import AdmissionVitals from '@/components/dashboard/admit/AdmissionVitals';
import { fetchOneAdmission } from '@/redux/features/inpatient';
import Schedules from '@/components/dashboard/admit/Schedules';
import AdmittedInvoices from '@/components/dashboard/admit/AdmittedInvoices';

const tabs = [
  { label: 'Patient Details', value: 0 },
  { label: 'Admission Details', value: 1 },
  { label: 'Vitals', value: 2 },
  { label: 'Schedules', value: 3 },
  { label: 'Lab Tests', value: 4 },
  { label: 'Prescriptions', value: 5 },
  {label: 'Invoices', value: 6}
];

const AdmittedPatient = ({ admission_process_id, patient_admission }) => {
  const [currentTab, setCurrentTab] = useState(0)
  const { processDetails } = useSelector((store) => store.patient);
  const { oneAdmission } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    if (auth?.token && admission_process_id && patient_admission) {
      dispatch(getOneProcess(auth, admission_process_id));
      dispatch(fetchOneAdmission(auth, "", patient_admission));
    }
  }, [auth?.token, admission_process_id, dispatch, patient_admission]);

  const tabsJsx = tabs.map((tab) => (
    <div key={tab.value}>
      <p
        className={`${
          currentTab === tab.value
            ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
            : "cursor-pointer text-center p-4"
        } `}
        onClick={() => setCurrentTab(tab.value)}
      >
        {tab.label}
      </p>
    </div>
  ));


  return (
    <Container maxWidth="xl" className="mt-8">
      <AdmitNav />
      <section className="mb-2">
        <div className="w-full overflow-x-auto py-1 px-2 flex items-center gap-4 text-center">
          {tabsJsx}
        </div>
      </section>
      <div className="mt-2">
        {currentTab === 0 && <AdmittedPatientDetails patient={processDetails.patient}/>}
        {currentTab === 1 && <AdmissionDetails admission_id={patient_admission} />}
        {currentTab === 2 && <AdmissionVitals patient={`${oneAdmission.patient_first_name} ${oneAdmission.patient_second_name}`} admission_id={patient_admission} triage={processDetails.triage}/>}
        {currentTab === 3 && 
                <Schedules 
                  patient={`${oneAdmission.patient_first_name} ${oneAdmission.patient_second_name}`} 
                  admission_id={patient_admission} 
                  process={processDetails}
                />
        }
        {currentTab === 4 && <AdmittedTests patient={`${oneAdmission.patient_first_name} ${oneAdmission.patient_second_name}`} process={processDetails} />}
        {currentTab === 5 && <AdmittedPrescription patient={`${oneAdmission.patient_first_name} ${oneAdmission.patient_second_name}`} prescription={processDetails.prescription} process={processDetails}/>}
        {currentTab === 6 && <AdmittedInvoices invoice={processDetails.invoice} patient={`${oneAdmission.patient_first_name} ${oneAdmission.patient_second_name}`}/>}
      </div>
    </Container>
  )
}

AdmittedPatient.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default AdmittedPatient

export async function getServerSideProps(context) {
  const { admission_process_id, patient_admission } = context.params || {};
  return {
    props: {
      admission_process_id: admission_process_id ?? null,
      patient_admission: patient_admission ?? null,
    },
  };
}
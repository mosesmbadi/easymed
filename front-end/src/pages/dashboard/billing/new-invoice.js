import React, { useEffect, useState } from "react";
import CustomizedLayout from "../../../components/layout/customized-layout";
import { Container } from "@mui/material";
import BillingDetails from "./billing-details";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { getAllPatients } from "@/redux/features/patients";
import AppointmentBilling from "./appointment-billing";
import TriageBilling from "./triage-billing";
import PrescriptionBilling from "./prescription-billing";
import LabRequestBilling from "./lab-request-billing";
import { useAuth } from "@/assets/hooks/use-auth";

const Billing = () => {
  const [loading, setLoading] = useState(false);
  const { patients } = useSelector((store) => store.patient);
  const dispatch = useDispatch();
  const auth = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(4);


  useEffect(() => {
    dispatch(getAllPatients(auth));
  }, []);

  return (
    <>
      <Container maxWidth="xl" className="my-8">
        <section className=" bg-white p-2 shadow w-8/12 mx-auto rounded">
          {currentStep === 0 && (
            <Formik
            // initialValues={initialValues}
            // validationSchema={validationSchema}
            // onSubmit={handleCreateUser}
            >
              <Form>
                <section className="flex items-center justify-between gap-2 w-full">
                  <div className="w-full">
                    <Field
                      as="select"
                      className="block pr-9 border w-full rounded-xl text-sm border-gray py-2 px-4 focus:outline-none"
                    //   name="group"
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value="">
                          {patient.first_name} {patient.second_name}
                        </option>
                      ))}
                    </Field>
                  </div>
                  <div className="w-full">
                    <Field
                      as="select"
                      className="block pr-9 border w-full rounded-xl text-sm border-gray py-2 px-4 focus:outline-none"
                    //   name="group"
                    >
                      <option value="">Select Consultation</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value="">
                          {patient.first_name} {patient.second_name}
                        </option>
                      ))}
                    </Field>
                  </div>
                  <div className="w-full">
                    <Field
                      className="block pr-9 border w-full rounded-xl text-sm border-gray py-2 px-4 focus:outline-none"
                    //   name="group"
                      placeholder="Set Price"
                    />
                      
                  </div>
                  <div className="w-7/12">
                    <button
                      type="submit"
                      className="bg-primary w-full rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {loading && (
                        <svg
                          aria-hidden="true"
                          role="status"
                          class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          ></path>
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="#1C64F2"
                          ></path>
                        </svg>
                      )}
                      Create Invoice
                    </button>
                  </div>
                </section>
              </Form>
            </Formik>
          )}
          {currentStep === 1 && <AppointmentBilling />}
          {currentStep === 2 && <TriageBilling />}
          {currentStep === 3 && <PrescriptionBilling />}
          {currentStep === 4 && <LabRequestBilling />}

          <div className="flex gap-2 items-center justify-end mt-8">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className={`${currentStep === totalSteps ? 'bg-success text-white' : 'border border-gray'} border border-gray rounded-xl px-4 py-2 text-xs`}
              >
                Prev
              </button>
            )}
            <button
              disabled={currentStep === totalSteps}
              onClick={() => setCurrentStep(currentStep + 1)}
              className={`${currentStep === totalSteps ? 'border border-gray' : 'bg-success text-white'} rounded-xl px-4 py-2 text-xs`}
            >
              Next
            </button>
          </div>
        </section>
        <BillingDetails />
      </Container>
    </>
  );
};

Billing.getLayout = (page) => <CustomizedLayout>{page}</CustomizedLayout>;

export default Billing;

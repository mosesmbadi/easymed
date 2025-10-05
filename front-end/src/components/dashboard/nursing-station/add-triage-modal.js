import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllProcesses, getPatientTriage } from "@/redux/features/patients";
import { updateAttendanceProcesses, updatePatientTriage } from "@/redux/service/patients";

export default function AddTriageModal({
  triageOpen,
  setTriageOpen,
  selectedRowData,
}) {
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const dispatch = useDispatch();
  const { patientTriage, patients } = useSelector((store) => store.patient )

  const triagePatient = patients.find((patient)=> patient.id === selectedRowData?.patient)


  useEffect(()=> {
    if(auth && selectedRowData){
      fetchPatientTriage(selectedRowData.triage)
    }
  }, [triageOpen])

  const fetchPatientTriage = async (triage_id)=> {
    try{
      dispatch(getPatientTriage(triage_id, auth))
    }catch(error){

    }
  }

  const handleClose = () => {
    setTriageOpen(false);
  };

  const initialValues = {
    temperature: patientTriage?.temperature,
    height: patientTriage?.height ? patientTriage?.height : "",
    weight: patientTriage?.weight ? patientTriage?.weight : "",
    pulse: patientTriage?.pulse ? patientTriage?.pulse : "",
    systolic:patientTriage?.systolic ? patientTriage?.systolic : "",
    diastolic: patientTriage?.diastolic ? patientTriage?.diastolic : "",
    bmi:patientTriage?.bmi ? patientTriage?.bmi : "",
    notes: patientTriage?.notes ? patientTriage?.notes : "",
  };

  const validationSchema = Yup.object().shape({
    temperature: Yup.number().required("Temperature is required!"),
    height: Yup.number().required("Height is required!"),
    weight: Yup.number().required("Weight is required!"),
    pulse: Yup.number().required("Pulse is required!"),
    systolic: Yup.number().required("Systolic is required!"),
    diastolic: Yup.number().required("Diastolic is required!"),
    // notes: Yup.string().required("Notes is required!"),
  });

  const calculateBMI = (height, weight) => {
    if (height && weight) {
      const bmi = (weight / (height / 100) ** 2).toFixed(2);
      if(bmi < 18.5){
        return bmi + " " + "(Underweight)"
      }else if(bmi >= 18.5 && bmi <= 24.9){
        return bmi + " " + "(Ok)"
      }else if(bmi >= 25 && bmi <= 24.9){
        return bmi + " " + "(Overweight)"
      }else{
        return bmi + " " + "(Obes)"
      }
    }
    return "";
  };

  const sendToDoc = async (payload, process_id)=> {
    try{
      const response = await updateAttendanceProcesses(payload, process_id, auth)
      dispatch(getAllProcesses(auth))
      console.log("SUCCESSFULLY SENT TO DOC", response)

    }catch(error){
      console.log("FAILED SENDING TO DOCTOR", error)

    }

  }

  const handleUpdateTriage = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
        created_by_user: auth?.user_id,
        bmi: parseFloat(formValue.bmi).toFixed(1),
      };
      setLoading(true);
      await updatePatientTriage(selectedRowData?.triage, formData, auth).then(() => {
        helpers.resetForm();
        sendToDoc({track:"doctor"}, selectedRowData?.id)
        setLoading(false);
        handleClose();
        toast.success("Triage Created Successfully!");
      });
    } catch (err) {
      setLoading(false);
      toast.error(err);
    }
  };

  return (
    <React.Fragment>
      <Dialog
        open={triageOpen}
        fullWidth
        maxWidth="sm"
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <div className="flex justify-between items-center">
            <p>{`${triagePatient?.first_name} ${triagePatient?.second_name}`}</p>
            <p>{`Gender: ${triagePatient?.gender}`}</p>
            <p>{`Age: ${triagePatient?.age}`}</p>

          </div>          
        </DialogTitle>
        <DialogContent>
          <h2 className="py-2 text-sm font-semibold">{"Update Vital Signs"}</h2>
          <Formik
            key={JSON.stringify(initialValues)}
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleUpdateTriage}
          >
          {({ values, setFieldValue }) => {
            return (
            <Form className="w-full">
              <section className="">
                <section className="flex items-center justify-between gap-2 py-2 w-full">
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Temperature"
                      name="temperature"
                    />
                    <ErrorMessage
                      name="temperature"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Height(cm)"
                      name="height"
                      onChange={(e) => {
                        setFieldValue("height", e.target.value);
                        setFieldValue("bmi", calculateBMI(e.target.value, values.weight));
                      }}
                    />
                    <ErrorMessage
                      name="height"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Weight(kg)"
                      name="weight"
                      onChange={(e) => {
                        setFieldValue("weight", e.target.value);
                        setFieldValue("bmi", calculateBMI(values.height, e.target.value));
                      }}
                    />
                    <ErrorMessage
                      name="weight"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                  <div className="w-full my-2">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="BMI"
                      name="bmi"
                      disabled
                    />
                  </div>
                </section>
                <section className="flex items-center justify-between gap-2 py-2 w-full">
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Pulse"
                      name="pulse"
                    />
                    <ErrorMessage
                      name="pulse"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Systolic"
                      name="systolic"
                    />
                    <ErrorMessage
                      name="systolic"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                  <div className="w-full">
                    <Field
                      className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="diastolic"
                      name="diastolic"
                    />
                    <ErrorMessage
                      name="diastolic"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </div>
                </section>
              </section>
              <div className="w-full my-2">
                <Field
                  as="textarea"
                  className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                  type="text"
                  placeholder="Notes"
                  name="notes"
                />
                <ErrorMessage
                  name="notes"
                  component="div"
                  className="text-warning text-xs"
                />
              </div>
              <button
                type="submit"
                className="bg-primary text-sm rounded-xl w-full px-8 py-2 mt-3 text-white"
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
                Update Triage
              </button>
            </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}

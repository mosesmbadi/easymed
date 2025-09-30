import React, { useEffect, useState } from 'react'
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { toast } from 'react-toastify';
import { admitPatient } from '@/redux/service/inpatient';
import { fetchHospitalBeds, fetchHospitalWards } from '@/redux/features/inpatient';
import { updateAttendanceWithAdmission } from '@/redux/features/patients';

const AdmitModal = ({admitOpen, setAdmitOpen, selectedRowdata}) => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { processes, patients } = useSelector((store)=> store.patient)
  const [selectedWard, setSelectedWard] = useState("");
  const { beds, wards } = useSelector((store) => store.inpatient);

  const patientRender = () => {
    const patient = patients.find((patient) => patient.id === selectedRowdata.patient);
    return patient ? patient : {};
  }

  const handleClose = () => {
    setAdmitOpen(false);
  };

  const initialValues = {
    attendance_process: selectedRowdata.id,
    patient: selectedRowdata.patient,
    reason_for_admission: "",
    admitted_by: auth.user_id,
    ward: "",
    bed: "",
  };

  const validationSchema = Yup.object().shape({
    reason_for_admission: Yup.string().required("This field is required!"),
    ward: Yup.number().required("Ward is required!").min(1, "Ward must be at least 1"),
    bed: Yup.number().required("Bed is required!").min(1, "Bed must be at least 1"),
  });

  const handleAdmissions = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
      };
      setLoading(true);
      const response = await admitPatient(auth, formData);
      dispatch(updateAttendanceWithAdmission(response));
      setLoading(false);
      handleClose();
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {

        const fetchWards = () => {
            try {
                dispatch(fetchHospitalWards(auth));
            } catch (error) {
                console.error("Error fetching wards:", error);
            }
        };

        if(auth.token){
            fetchWards();            
        }


  },[])

  return (
    <section>
        <Dialog
            fullWidth
            maxWidth="md"
            open={admitOpen}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle>
              <div className="flex justify-between">
                  <p>{`Name: ${patientRender()?.first_name} ${patientRender()?.second_name}`}</p>
                  <p>{`PId: ${patientRender()?.unique_id}`}</p>
                  <p>{`Gender: ${patientRender()?.gender}`}</p>
                  <p>{`Age: ${patientRender()?.age}`}</p>
              </div>
            </DialogTitle>
            <DialogContent>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleAdmissions}
            >
                {({ values, handleChange }) => (
                <Form>
                    <Grid container spacing={4}>
                        <Grid item md={12} xs={12}>
                            <label>Select Ward</label>
                            <Field
                                as="select"
                                className="block text-sm pr-9 border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                onChange={(e) => {
                                    handleChange(e);
                                    dispatch(fetchHospitalBeds(auth, e.target.value));
                                    setSelectedWard(e.target.value);
                                }}
                                name="ward"
                                >
                                <option value="">Select Ward</option>
                                {wards.map((ward, index) => (
                                    <option key={index} value={ward.id}>
                                    {ward?.name}
                                    </option>
                                ))}
                            </Field>
                            <ErrorMessage
                                name="ward"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <label>Select Bed</label>
                            <Field
                                as="select"
                                className="block text-sm pr-9 border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                onChange={(e) => {
                                    handleChange(e);
                                    setSelectedWard(e.target.value);
                                }}
                                name="bed"
                                >
                                <option value="">Select Bed</option>
                                {beds.filter((beed)=>beed.status === "available").map((bed, index) => (
                                  <option key={index} value={bed.id}>
                                    {bed?.bed_number} - {bed?.bed_type}
                                  </option>
                                ))}
                            </Field>
                            <ErrorMessage
                                name="bed"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <label>Reason for Admission</label>
                            <Field
                                as="textarea"
                                className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                                maxWidth="sm"
                                rows={7}
                                placeholder="Reason for Admission"
                                name="reason_for_admission"
                            />
                            <ErrorMessage
                                name="reason_for_admission"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <div className="flex items-center justify-end">
                              <button
                                type="submit"
                                className="bg-primary rounded-xl text-sm px-8 py-4 text-white"
                              >
                                {loading && (
                                <svg
                                  aria-hidden="true"
                                  role="status"
                                  className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
                                </svg>)}
                                  Admit
                              </button>
                            </div>
                        </Grid>
                    </Grid>
                </Form>
                )}
            </Formik>
            </DialogContent>
        </Dialog>
    </section>
  )
}

export default AdmitModal
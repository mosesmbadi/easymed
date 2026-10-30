import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Container, Dialog, DialogContent, DialogTitle, Grid, Typography } from '@mui/material'
import * as Yup from 'yup'
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import SeachableSelect from '@/components/select/Searchable';
import { getAllServices } from "@/redux/features/patients";
import { getAllLabTestProfiles } from "@/redux/features/laboratory";
import { IoAddOutline } from "react-icons/io5";
import { patientPublicPrescriptionRequest } from '@/redux/service/patientUser';
import { useAuth } from '@/assets/hooks/use-auth';
import FileUpload from '@/components/upload/FileUpload';

const mb = { marginBottom: 8 };

const PatientPrescriptionRequest = () => {
    const { labTestProfiles } = useSelector((store) => store.laboratory);
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const fileRef = useRef(null);
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const auth = useAuth()
    const { patients } = useSelector((store) => store.patient);
    const loggedInPatient = patients.find((patient)=> patient.user === auth?.user_id)

    console.log("ADD PATIENT PRESCRIPTION REQUEST", loggedInPatient)

    const handleClickOpen = () => {
      setOpen(true);
    };

    const handleClose = () => {
      setOpen(false);
    };
  
    const initialValues = {
      public_prescription: null,
      patient: loggedInPatient?.id,
      status: "pending"
    };
  
    const validationSchema = Yup.object().shape({
          // public_prescription: Yup.mixed()
          // .test("is-file-too-big", "File exceeds 10MB", () => {
          //   let valid = true;
          //   const files = fileRef?.current?.files;
          //   if (files) {
          //     const fileArr = Array.from(files);
          //     fileArr.forEach((file) => {
          //       const size = file.size / 1024 / 1024;
          //       if (size > 10) {
          //         valid = false;
          //       }
          //     });
          //   }
          //   return valid;
          // })
          // .test(
          //   "is-file-of-correct-type",
          //   "File is not of supported type",
          //   () => {
          //     let valid = true;
          //     const files = fileRef?.current?.files;
          //     if (files) {
          //       const fileArr = Array.from(files);
          //       fileArr.forEach((file) => {
          //         const type = file.type.split("/")[1];
          //         const validTypes = [
          //           "pdf",
          //           "jpeg",
          //           "png",
          //           "jpg",
          //         ];
          //         if (!validTypes.includes(type)) {
          //           valid = false;
          //         }
          //       });
          //     }
          //     return valid;
          //   }
          // )
      });
  
    const handlePatientLabRequest = async (formValue, helpers) => {
      
      const payload = {
        ...formValue,
      }
      console.log("FORM_VALUE ", payload);
      try {
        setLoading(true);
        await patientPublicPrescriptionRequest(payload).then(() => {
          helpers.resetForm();
          toast.success("Lab Request sent successfully!");
          setLoading(false);
          handleClose();
        });
      } catch (err) {
        toast.error(err);
        setLoading(false);
        console.log("PATIENT_LAB_REQ_ERROR ", err);
      }
    };
  
    useEffect(() => {
      dispatch(getAllServices());
      dispatch(getAllLabTestProfiles());
    }, []);
  return (
    <>
    <button className='px-4 py-2 rounded-lg bg-primary text-white flex gap-2 items-center' onClick={handleClickOpen}>
      <IoAddOutline /> <span>Prescription Request</span>
    </button>
    <Dialog
        open={open}
        fullWidth
        maxWidth="sm"
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="patient-lab-test-request">
          {"Request a lab test"}
        </DialogTitle>
        <DialogContent>
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handlePatientLabRequest}
          >
            <Form className="md:w-full w-full h-64 mx-auto">
                <Grid item md={12} xs={12} className='py-2'>
                  <Typography variant="request_pdf" gutterBottom style={mb}>
                    add request pdf
                  </Typography>
                  
                  {/* CHANGE NAME TO public_prescription*/}

                  <FileUpload id="uploading_Patient_prescription_req" name="change_to_public_prescription" fileRef={fileRef} />
                </Grid>
                <button
                  type="submit"
                  className="bg-primary px-4 py-2 text-white"
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
                  add Prescription Request
              </button>
            </Form>
        </Formik>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PatientPrescriptionRequest
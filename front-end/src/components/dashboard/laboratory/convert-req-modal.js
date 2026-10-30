import React, { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useDispatch, useSelector } from "react-redux";
import { getAllLabEquipments, getAllLabTestProfiles, getAllPublicLabRequests } from "@/redux/features/laboratory";
import { sendLabRequests, updatePublicLabRequest } from "@/redux/service/laboratory";
import { useAuth } from "@/assets/hooks/use-auth";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { toast } from 'react-toastify'
import { Grid } from "@mui/material";
import { createPatient } from "@/redux/service/patients";
import SeachableSelect from "@/components/select/Searchable";

const ConvertToLabReq = ({ selectedRowData, open, setOpen }) => {
    const dispatch = useDispatch();
    const auth = useAuth();
    const { labTestProfiles } = useSelector((store) => store.laboratory);
    const [loading, setLoading] = React.useState(false);
    const testProfile = labTestProfiles.find((profile)=> profile.id === selectedRowData.test_profile)
    
    const handleClose = () => {
      setOpen(false);
    };
  
    useEffect(() => {
      if (auth) {
        dispatch(getAllLabEquipments(auth));
        dispatch(getAllLabTestProfiles(auth));
      }
    }, [auth]);
  
    const initialValues = {
        note: "",
        sample_collected: true,
        patient: selectedRowData?.patient,
        test_profile: {label:testProfile?.name, value:testProfile.id},
        requested_by: auth.user_id
    };
  
    const validationSchema = Yup.object().shape({
      note: Yup.string().required("This field is required!"),
      test_profile: Yup.object().required("This field is required!"),
    });

    const saveNewLabRequest = async (payload) => {
        try{
            setLoading(true);
            const labReqInfo = {
                ...payload,
            }
            await sendLabRequests(labReqInfo, auth)
            updatePublicLabReq()
            dispatch(getAllPublicLabRequests(auth));
            toast.success("Test Request Saved Successful!");
            setLoading(false);
            handleClose();
        }catch(error){
            toast.error(error);
            setLoading(false);
        }
    }

    const updatePublicLabReq = async () => {
        try{
            const updatePayload = {
                ...selectedRowData,
                status:"confirmed"
            }
            await updatePublicLabRequest(updatePayload, auth)
            toast.success("successfully updated public request");
        }catch(error){
            toast.error(error);
        }
    }

    /**
     * function that converts public lab test requests to lab test requests
     * @param {*} formValue - The value of the form containing lab test request data.
     * @param {*} helpers - Additional helper functions or objects.
     * @returns {Promise} - A promise that resolves when the conversion is complete.
     */
  
    const handleCovertReq = async (formValue, helpers) => {
      try {
        const formData = {
          ...formValue,
          test_profile:formValue.test_profile.value
        }

        console.log("TEST PROFILE DATA BEFORE CONVERTING", formData)
        if (selectedRowData.status === "confirmed"){
            toast.error("Request already confirmed");
            return;
        }

        saveNewLabRequest(formData);
      } catch (err) {
        toast.error(err);
        setLoading(false);
      }
    };
  return (
    <container>
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Convert from Public Lab Request"}</DialogTitle>
      <DialogContent>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleCovertReq}
        >
          <Form>
          <Grid container spacing={2}>
                <Grid item md={12} xs={12}>
                <section className="space-y-3">
                  <div>
                    <SeachableSelect
                      label="Test Profile"
                      name="test_profile"
                      options={labTestProfiles.map((labTestProfile) => ({ value: labTestProfile.id, label: `${labTestProfile?.name}` }))}                    
                    />
                    <ErrorMessage
                        name="test_profile"
                        component="div"
                        className="text-warning text-xs"
                    />
                  </div>
                  <div>
                    <label>Reason</label>
                    <Field
                        as="textarea"
                        className="block border border-gray rounded-xl py-3 px-4 focus:outline-none w-full"
                        type="text"
                        placeholder="Add a Note"
                        name="note"
                    />
                    <ErrorMessage
                        name="note"
                        component="div"
                        className="text-warning text-xs"
                    />
                  </div>
                </section>
                </Grid>
            </Grid>
            <Grid className="flex justify-end w-full" item md={12} xs={12}>
            <button
              type="submit"
              className="bg-[#02273D] px-4 py-2 mt-4 rounded-xl text-white text-sm"
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
              convert request
            </button>
            </Grid>
          </Form>
        </Formik>
      </DialogContent>
    </Dialog>
  </container>
  )
}

export default ConvertToLabReq;
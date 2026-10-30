import React, { useState } from 'react'
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';

import { useAuth } from '@/assets/hooks/use-auth';
import { updateInpatientScheduledDrug } from '@/redux/features/inpatient';

const MedicatePatient = ({open, setOpen, selectedRowData, admission_id}) => {
    const [loading, setLoading] = useState(false);
    const auth = useAuth()
    const dispatch = useDispatch();
  
    const handleClose = () => {
      setOpen(false);
    };

    const calculateNextSchedule = () => {
        let frequency = selectedRowData.frequency;
        let timesPerDay = 24 / parseInt(frequency);

        // From Now Add Times Per Day Hours
        let nextSchedule = new Date();
        nextSchedule.setHours(nextSchedule.getHours() + timesPerDay);

        // Format the date to a local string instead of using toISOString()
        const year = nextSchedule.getFullYear();
        const month = String(nextSchedule.getMonth() + 1).padStart(2, '0');
        const day = String(nextSchedule.getDate()).padStart(2, '0');
        const hours = String(nextSchedule.getHours()).padStart(2, '0');
        const minutes = String(nextSchedule.getMinutes()).padStart(2, '0');

        // Create the formatted string in "YYYY-MM-DDTHH:MM" format
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

        return formattedDate;
    }

    const initialValues = {
      schedule_time: calculateNextSchedule () || "",
    };
  
    const validationSchema = Yup.object().shape({
      schedule_time: Yup.string().required("Schedule is required!"),
    });

    const handleMedicatePatient = async (formValue) => {
        try{
            dispatch(updateInpatientScheduledDrug(auth, admission_id, selectedRowData.id, formValue))
            handleClose();
            toast.success("Schedule successfully!");

        }catch(error){
            toast.error("Error Scheduling.");
        }
    }
  

  return (
    <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleMedicatePatient}
          >
            <Form>
              <section className="space-y-1">
                <h2 className="text-sm font-semibold text-primary">Next Schedule</h2>
                <Grid className="py-3 " container spacing={1}>
                    <Grid item md={12} xs={12}>
                        <Field
                            type="datetime-local"
                            id="expiry_date"
                            className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                            placeholder="Next Schedule"
                            name="schedule_time"
                        />
                        <ErrorMessage
                            name="schedule_time"
                            component="div"
                            className="text-warning text-xs"
                        />
                    </Grid>    
                </Grid>
                <div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-primary rounded-xl text-sm px-4 py-2 text-white"
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
                      Schedule
                    </button>
                    <button
                      onClick={handleClose}
                      className="border border-warning rounded-xl text-sm px-4 py-2 text-[#02273D]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </section>
            </Form>
          </Formik>
        </DialogContent>
      </Dialog>
  )
}

export default MedicatePatient
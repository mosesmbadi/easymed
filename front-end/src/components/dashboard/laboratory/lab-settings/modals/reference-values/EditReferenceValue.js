import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";
import { updateReferenceValue } from "@/redux/service/laboratory";
import { updateReferenceValueToStore } from "@/redux/features/laboratory";

const sexOptions = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
];

const EditReferenceValueModal = ({ open, setOpen, selectedRowData }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const { labTestPanels } = useSelector((store) => store.laboratory);

  const handleClose = () => {
    setOpen(false);
  };

  const getPanel = () => {
    const panel = labTestPanels.find(
      (item) => parseInt(item.id) === parseInt(selectedRowData?.lab_test_panel)
    );
    return panel ? { value: panel.id, label: panel.name } : "";
  };

  const getSex = () => {
    const option = sexOptions.find((item) => item.value === selectedRowData?.sex);
    return option || "";
  };

  const initialValues = {
    lab_test_panel: getPanel(),
    sex: getSex(),
    age_min: selectedRowData?.age_min ?? "",
    age_max: selectedRowData?.age_max ?? "",
    ref_value_low: selectedRowData?.ref_value_low ?? "",
    ref_value_high: selectedRowData?.ref_value_high ?? "",
  };

  const validationSchema = Yup.object().shape({
    lab_test_panel: Yup.object().required("Field is required!"),
    sex: Yup.object().required("Field is required!"),
    age_min: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Age min must be a number"),
    age_max: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Age max must be a number"),
    ref_value_low: Yup.number().required("Field is required!").typeError("Must be a number"),
    ref_value_high: Yup.number().required("Field is required!").typeError("Must be a number"),
  });

  const updateAReferenceValue = async (formValue) => {
    const payload = {
      lab_test_panel: formValue.lab_test_panel.value,
      sex: formValue.sex.value,
      age_min: formValue.age_min === "" ? null : Number(formValue.age_min),
      age_max: formValue.age_max === "" ? null : Number(formValue.age_max),
      ref_value_low: Number(formValue.ref_value_low),
      ref_value_high: Number(formValue.ref_value_high),
    };

    try {
      setLoading(true);
      const response = await updateReferenceValue(parseInt(selectedRowData?.id), payload, auth);
      dispatch(updateReferenceValueToStore(response));
      setLoading(false);
      toast.success("Reference value updated successfully!");
      handleClose();
    } catch (err) {
      toast.error(err);
      console.log("EDIT_ERROR ", err);
    }
  };

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="md"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <h2 className="my-10 font-bold text-xl">Edit Reference Value</h2>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={updateAReferenceValue}
            enableReinitialize={true}
          >
            <Form>
              <Grid container spacing={2}>
                <Grid item md={4} xs={12}>
                  <SeachableSelect
                    label="Test Panel"
                    name="lab_test_panel"
                    options={labTestPanels.map((panel) => ({
                      value: panel.id,
                      label: `${panel?.name}`,
                    }))}
                  />
                  <ErrorMessage name="lab_test_panel" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={4} xs={12}>
                  <SeachableSelect label="Sex" name="sex" options={sexOptions} />
                  <ErrorMessage name="sex" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={4} xs={12}>
                  <Field
                    className="block border border-gray py-3 px-4 focus:outline-none w-full"
                    type="number"
                    placeholder="Age Min"
                    name="age_min"
                  />
                  <ErrorMessage name="age_min" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={4} xs={12}>
                  <Field
                    className="block border border-gray py-3 px-4 focus:outline-none w-full"
                    type="number"
                    placeholder="Age Max"
                    name="age_max"
                  />
                  <ErrorMessage name="age_max" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={4} xs={12}>
                  <Field
                    className="block border border-gray py-3 px-4 focus:outline-none w-full"
                    type="number"
                    step="0.01"
                    placeholder="Reference Low"
                    name="ref_value_low"
                  />
                  <ErrorMessage name="ref_value_low" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={4} xs={12}>
                  <Field
                    className="block border border-gray py-3 px-4 focus:outline-none w-full"
                    type="number"
                    step="0.01"
                    placeholder="Reference High"
                    name="ref_value_high"
                  />
                  <ErrorMessage name="ref_value_high" component="div" className="text-warning text-xs" />
                </Grid>
                <Grid item md={12} xs={12}>
                  <div className="flex justify-end gap-2 h-full">
                    <button type="submit" className="bg-primary px-4 py-2 text-white">
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
                        </svg>
                      )}
                      Update
                    </button>
                  </div>
                </Grid>
              </Grid>
            </Form>
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EditReferenceValueModal;

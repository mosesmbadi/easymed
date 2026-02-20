import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid, Checkbox, FormControlLabel } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";
import { updateLabTestInterpretation } from "@/redux/service/laboratory";
import { updateLabTestInterpretationToStore } from "@/redux/features/laboratory";

const sexOptions = [
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
    { value: "B", label: "Both" },
];

const rangeTypeOptions = [
    { value: "critical_low", label: "Critical Low" },
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "critical_high", label: "Critical High" },
];

const EditProfessionalInterpretationModal = ({ open, setOpen, selectedRowData }) => {
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
        return option || sexOptions[2]; // fallback to Both
    };

    const getRangeType = () => {
        const option = rangeTypeOptions.find((item) => item.value === selectedRowData?.range_type);
        return option || "";
    };

    const initialValues = {
        lab_test_panel: getPanel(),
        range_type: getRangeType(),
        sex: getSex(),
        age_min: selectedRowData?.age_min ?? "",
        age_max: selectedRowData?.age_max ?? "",
        value_min: selectedRowData?.value_min ?? "",
        value_max: selectedRowData?.value_max ?? "",
        interpretation: selectedRowData?.interpretation ?? "",
        clinical_action: selectedRowData?.clinical_action ?? "",
        requires_immediate_attention: selectedRowData?.requires_immediate_attention ?? false,
    };

    const validationSchema = Yup.object().shape({
        lab_test_panel: Yup.object().required("Field is required!"),
        range_type: Yup.object().required("Field is required!"),
        sex: Yup.object().required("Field is required!"),
        age_min: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === "" ? null : value))
            .typeError("Age min must be a number"),
        age_max: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === "" ? null : value))
            .typeError("Age max must be a number"),
        value_min: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === "" ? null : value))
            .typeError("Must be a number"),
        value_max: Yup.number()
            .nullable()
            .transform((value, originalValue) => (originalValue === "" ? null : value))
            .typeError("Must be a number"),
        interpretation: Yup.string().required("Interpretation text is required!"),
        clinical_action: Yup.string(),
        requires_immediate_attention: Yup.boolean()
    });

    const updateAnInterpretation = async (formValue) => {
        const payload = {
            lab_test_panel: formValue.lab_test_panel.value,
            range_type: formValue.range_type.value,
            sex: formValue.sex.value,
            age_min: formValue.age_min === "" ? null : Number(formValue.age_min),
            age_max: formValue.age_max === "" ? null : Number(formValue.age_max),
            value_min: formValue.value_min === "" ? null : Number(formValue.value_min),
            value_max: formValue.value_max === "" ? null : Number(formValue.value_max),
            interpretation: formValue.interpretation,
            clinical_action: formValue.clinical_action,
            requires_immediate_attention: formValue.requires_immediate_attention,
        };

        try {
            setLoading(true);
            const response = await updateLabTestInterpretation(parseInt(selectedRowData?.id), payload, auth);
            dispatch(updateLabTestInterpretationToStore(response));
            setLoading(false);
            toast.success("Interpretation updated successfully!");
            handleClose();
        } catch (err) {
            setLoading(false);
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
                    <h2 className="my-10 font-bold text-xl">Edit Interpretation</h2>

                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={updateAnInterpretation}
                        enableReinitialize={true}
                    >
                        {({ values, setFieldValue }) => (
                            <Form>
                                <Grid container spacing={2}>
                                    <Grid item md={6} xs={12}>
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
                                    <Grid item md={3} xs={12}>
                                        <SeachableSelect label="Range Type" name="range_type" options={rangeTypeOptions} />
                                        <ErrorMessage name="range_type" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={3} xs={12}>
                                        <SeachableSelect label="Sex" name="sex" options={sexOptions} />
                                        <ErrorMessage name="sex" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={3} xs={6}>
                                        <Field
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            type="number"
                                            placeholder="Age Min"
                                            name="age_min"
                                        />
                                        <ErrorMessage name="age_min" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={3} xs={6}>
                                        <Field
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            type="number"
                                            placeholder="Age Max"
                                            name="age_max"
                                        />
                                        <ErrorMessage name="age_max" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={3} xs={6}>
                                        <Field
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            type="number"
                                            step="0.01"
                                            placeholder="Value Min"
                                            name="value_min"
                                        />
                                        <ErrorMessage name="value_min" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={3} xs={6}>
                                        <Field
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            type="number"
                                            step="0.01"
                                            placeholder="Value Max"
                                            name="value_max"
                                        />
                                        <ErrorMessage name="value_max" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={6} xs={12}>
                                        <Field
                                            as="textarea"
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            rows={2}
                                            placeholder="Clinical Interpretation Text"
                                            name="interpretation"
                                        />
                                        <ErrorMessage name="interpretation" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={6} xs={12}>
                                        <Field
                                            as="textarea"
                                            className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                            rows={2}
                                            placeholder="Suggested Clinical Action"
                                            name="clinical_action"
                                        />
                                        <ErrorMessage name="clinical_action" component="div" className="text-warning text-xs" />
                                    </Grid>
                                    <Grid item md={12} xs={12} className="flex items-center justify-between">
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={values.requires_immediate_attention}
                                                    onChange={(e) => setFieldValue("requires_immediate_attention", e.target.checked)}
                                                    color="primary"
                                                />
                                            }
                                            label="Requires Immediate Attention"
                                        />
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
                                    </Grid>
                                </Grid>
                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default EditProfessionalInterpretationModal;

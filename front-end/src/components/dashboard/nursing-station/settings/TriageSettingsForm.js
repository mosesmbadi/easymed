import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";
import { getTriageSettings } from "@/redux/features/patients";
import { updateTriageSettings } from "@/redux/service/patients";

const TriageSettingsForm = () => {
    const [loading, setLoading] = useState(false);
    const auth = useAuth();
    const dispatch = useDispatch();
    const { triageSettings } = useSelector((store) => store.patient);

    useEffect(() => {
        dispatch(getTriageSettings(auth));
    }, []);

    const initialValues = {
        spo2_min: triageSettings?.spo2_min || 90,
        spo2_warning_level: triageSettings?.spo2_warning_level || 94,
        systolic_min: triageSettings?.systolic_min || 90,
        systolic_max: triageSettings?.systolic_max || 180,
        diastolic_min: triageSettings?.diastolic_min || 60,
        diastolic_max: triageSettings?.diastolic_max || 120,
        temperature_min: triageSettings?.temperature_min || 35.0,
        temperature_max: triageSettings?.temperature_max || 40.0,
        pulse_min: triageSettings?.pulse_min || 40,
        pulse_max: triageSettings?.pulse_max || 120,
        is_active: triageSettings?.is_active ?? true,
    };

    const validationSchema = Yup.object().shape({
        spo2_min: Yup.number().required("Required"),
        spo2_warning_level: Yup.number().required("Required"),
        systolic_min: Yup.number().required("Required"),
        systolic_max: Yup.number().required("Required"),
        diastolic_min: Yup.number().required("Required"),
        diastolic_max: Yup.number().required("Required"),
        temperature_min: Yup.number().required("Required"),
        temperature_max: Yup.number().required("Required"),
        pulse_min: Yup.number().required("Required"),
        pulse_max: Yup.number().required("Required"),
        is_active: Yup.boolean()
    });

    const handleUpdateSettings = async (formValue) => {
        try {
            setLoading(true);
            await updateTriageSettings(formValue, auth);
            dispatch(getTriageSettings(auth));
            toast.success("Triage Settings Updated Successfully!");
            setLoading(false);
        } catch (err) {
            setLoading(false);
            toast.error(err.message || "Failed to update settings");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Visual Flagging Critical Values</h2>
            <Formik
                key={triageSettings ? "loaded" : "loading"} // Remounts form when settings load
                enableReinitialize
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleUpdateSettings}
            >
                {({ values, handleChange }) => (
                    <Form className="w-full space-y-6">

                        {/* Active Toggle */}
                        <div className="flex items-center gap-4">
                            <label className="font-semibold text-gray-700">Flagging System Active:</label>
                            <Field
                                type="checkbox"
                                name="is_active"
                                className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* SPO2 */}
                            <div className="border p-4 rounded-xl border-gray-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">SPO2 (%)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Critical Min</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="spo2_min"
                                        />
                                        <ErrorMessage name="spo2_min" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Warning Level</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="spo2_warning_level"
                                        />
                                        <ErrorMessage name="spo2_warning_level" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Systolic BP */}
                            <div className="border p-4 rounded-xl border-gray-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">Systolic (mmHg)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Critical Min</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="systolic_min"
                                        />
                                        <ErrorMessage name="systolic_min" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Critical Max</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="systolic_max"
                                        />
                                        <ErrorMessage name="systolic_max" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Diastolic BP */}
                            <div className="border p-4 rounded-xl border-gray-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">Diastolic (mmHg)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Critical Min</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="diastolic_min"
                                        />
                                        <ErrorMessage name="diastolic_min" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Critical Max</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="diastolic_max"
                                        />
                                        <ErrorMessage name="diastolic_max" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Temperature */}
                            <div className="border p-4 rounded-xl border-gray-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">Temperature (°C)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Critical Min</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            step="0.01"
                                            name="temperature_min"
                                        />
                                        <ErrorMessage name="temperature_min" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Critical Max</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            step="0.01"
                                            name="temperature_max"
                                        />
                                        <ErrorMessage name="temperature_max" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Pulse */}
                            <div className="border p-4 rounded-xl border-gray-200">
                                <h3 className="font-semibold text-lg mb-4 text-gray-800">Pulse (bpm)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Critical Min</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="pulse_min"
                                        />
                                        <ErrorMessage name="pulse_min" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Critical Max</label>
                                        <Field
                                            className="block border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                                            type="number"
                                            name="pulse_max"
                                        />
                                        <ErrorMessage name="pulse_max" component="div" className="text-warning text-xs mt-1" />
                                    </div>
                                </div>
                            </div>

                        </div>

                        <button
                            type="submit"
                            className="bg-primary text-sm rounded-xl px-8 py-3 text-white disabled:opacity-50 mt-4"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Settings"}
                        </button>

                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default TriageSettingsForm;

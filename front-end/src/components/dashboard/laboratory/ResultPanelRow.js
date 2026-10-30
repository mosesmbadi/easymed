import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import SeachableSelect from "@/components/select/Searchable";
import { Formik } from "formik";
import * as Yup from "yup";
import { updatePhlebotomySamples } from "@/redux/service/laboratory";
import { sendToEquipment } from "@/redux/service/laboratory";
import { toast } from "react-toastify";

const ResultPanelRow = ({ item, foundPanel, sample_id, collected }) => {
    const auth = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedEquip, setSelectedEquip] = useState(null);
    const { labEquipments } = useSelector((store) => store.laboratory);

    console.log("YOU TAKEEE ME OOOONNN", collected)

    const initialValues = {
        equipment: collected ? { value: "manual", label: "Manual" } : "",
    };

    const validationSchema = Yup.object().shape({
        equipment: Yup.object().required("This field is required!"),
    });

    const approveCollection = async () => {
        try {
            const payload = {
                is_sample_collected: true,
                id: sample_id,
            };
            await updatePhlebotomySamples(payload, auth);
        } catch (error) {
            console.log("ERR APPROVING COLLECTION OF SAMPLE", error);
        }
    };

    const handleSendEquipment = async (foundPanel, formValue, helpers) => {
        if (formValue.equipment.value === "manual") {
            setLoading(true);
            await approveCollection();
            setLoading(false);
            toast.success("Sent successfully");
            return;
        }
        try {
            const formData = {
                ...foundPanel,
                patient_id: foundPanel.patient_id,
                equipment: formValue.equipment.label,
            };
            setLoading(true);
            await approveCollection();
            await sendToEquipment(formData).then(() => {
                helpers?.resetForm();
                toast.success("Send to Equipment Successful!");
                setLoading(false);
            });
        } catch (err) {
            toast.error("Failed to send to equipment");
            console.log("ERROR SENDING TO EQUIPMENT", err);
            setLoading(false);
        }
    };

    return (
        <li>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={(values, { resetForm }) => {
                    handleSendEquipment(item, values, { resetForm });
                }}
            >
                {({ handleSubmit, values }) => (
                    <form
                        onSubmit={handleSubmit}
                        className="w-full flex items-center bg-red-400"
                    >
                        <span className="w-10/12">{foundPanel.name}</span>
                        <div className="w-full">
                            <SeachableSelect
                                name="equipment"
                                setSelectedItem={(value) => setSelectedEquip(value)}
                                options={[
                                    { value: "manual", label: "Manual" },
                                    ...labEquipments.map((equipment) => ({
                                        value: equipment.id,
                                        label: equipment.name,
                                    })),
                                ]}
                                disabled={loading}
                            />
                        </div>
                        {item?.is_billed ? (
                            <div className="w-full justify-end flex">
                                <button
                                    disabled={!values.equipment || loading}
                                    type="submit"
                                    className={`${!values.equipment || values.equipment.value === "manual" || loading
                                        ? "bg-gray cursor-not-allowed"
                                        : "bg-primary cursor-pointer"
                                        } text-white w-10/12 text-center py-2 text-xs rounded-xl flex justify-center items-center`}
                                >
                                    {loading ? "Sending..." : values.equipment.value === "manual" ? "Result Item Available" : "send"}
                                </button>
                            </div>
                        ) : (
                            <div className="w-full justify-center flex">
                                <div className="w-10/12 bg-primary text-white cursor-default px-3 py-2 text-xs rounded-xl text-center">
                                    Not Applicable
                                </div>
                            </div>
                        )}
                    </form>
                )}
            </Formik>
        </li>
    );
};

export default ResultPanelRow;
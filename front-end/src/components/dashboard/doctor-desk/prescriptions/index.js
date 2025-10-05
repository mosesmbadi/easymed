import React from "react";
import { AiFillDelete, AiOutlineSearch } from "react-icons/ai";
import { Formik, Field, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { getAllItems } from "@/redux/features/inventory";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { prescribeDrug } from "@/redux/service/patients";
import { deleteItem } from "@/redux/service/inventory";
import { createPrescription } from "@/redux/service/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const AllPrescriptions = ({ patient }) => {
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const { items } = useSelector((store) => store.inventory);
  const currentUser = useAuth();

  console.log("CURRENT ", currentUser);

  const initialValues = {
    name: "",
  };

  const prescribedValues = {
    dosage: "",
    frequency: "",
    duration: "",
    note: "",
    prescription: null,
    item: items[0]?.id,
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("This field is required!"),
  });

  const handleSearchItem = async (formValue, helpers) => {
    try {
      setLoading(true);
      const res = await dispatch(getAllItems(currentUser)).then(() => {
        console.log("RESPONSE ", res);
        helpers.resetForm();
        toast.success("Data Retrieved Successfully!");
        setLoading(false);
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
      setLoading(false);
    }
  };

  const handleCreatePrescribedDrug = async (formValue, helpers) => {
    try {
      setLoading(true);
      await dispatch(prescribeDrug(formValue)).then(() => {
        helpers.resetForm();
        toast.success("Data Retrieved Successfully!");
        setLoading(false);
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
      setLoading(false);
    }
  };

  const handleCreatePrescription = async () => {
    const prescriptionData = {
      start_date: new Date().toISOString().split("T")[0],
      status: "pending",
      patient_id: patient?.id,
      created_by: currentUser?.user_id,
    };

    try {
      setLoading(true);
      await createPrescription(prescriptionData);
      toast.success("Prescription created successfully");
      setLoading(false);
    } catch (error) {
      console.error("Error creating prescription:", error);
      toast.error("An error occurred while creating the prescription");
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-xl my-4">Drugs</h1>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSearchItem}
      >
        <Form>
          <section className="flex items-center gap-2">
            <div className="w-7/12">
              <Field
                className="block border bg-background rounded-xl border-gray py-2 text-sm px-4 focus:outline-none w-full"
                type="text"
                name="name"
                placeholder="Search Drug..."
              />
              <ErrorMessage
                name="name"
                component="div"
                className="text-warning text-xs"
              />
            </div>
            <div>
              <button
                type="submit"
                className="bg-primary rounded-xl flex items-center gap-2 w-full px-4 text-sm py-2 text-white"
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
                <AiOutlineSearch />
                Search
              </button>
            </div>
          </section>
        </Form>
      </Formik>

      {items?.map((item, index) => (
        <section key={index} className="bg-white shadow p-4 rounded mt-4">
          <Formik
            initialValues={prescribedValues}
            onSubmit={handleCreatePrescribedDrug}
          >
            <Form>
              <section
                key={index}
                className="bg-white shadow p-4 rounded flex justify-between gap-4 my-3"
              >
                <div>
                  <h1 className="font-semibold">{item.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Field
                      className="block border rounded-xl border-gray py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Dosage"
                      name="dosage"
                    />
                    <Field
                      className="block border rounded-xl border-gray  py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Frequency"
                      name="frequency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Field
                      className="block border rounded-xl border-gray  py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Duration(days)"
                      name="duration"
                    />
                    <Field
                      className="block border rounded-xl border-gray  py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Note"
                      name="note"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="submit"
                    className="bg-primary w-full rounded-xl px-4 text-sm py-2 text-white"
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
                    Save
                  </button>
                  <p
                    onClick={() => deleteItem(item.id)}
                    className="border cursor-pointer border-warning w-full px-4 text-sm py-2 flex items-center gap-2 text-primary"
                  >
                    <AiFillDelete />
                    Delete
                  </p>
                </div>
              </section>
            </Form>
          </Formik>
          <section className="flex justify-start">
            <div className="">
              <button
                onClick={handleCreatePrescription}
                className="bg-primary rounded-xl flex items-center gap-2 w-full px-4 text-sm py-2 text-white"
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
                Save Prescription
              </button>
            </div>
          </section>
        </section>
      ))}
    </>
  );
};

export default AllPrescriptions;

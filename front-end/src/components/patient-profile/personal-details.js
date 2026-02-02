import React, { useEffect } from "react";
import { FiEdit } from "react-icons/fi";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { getAllInsurance } from "@/redux/features/insurance";
import { useDispatch, useSelector } from "react-redux";
import { createPatient } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { getAllPatients, getPatientProfile } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const PersonalDetails = () => {
  const { insurance } = useSelector((store) => store.insurance);
  const { userProfile } = useSelector((store) => store.user);
  console.log("PROFILE_DETAILS ", userProfile);
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);
  const auth = useAuth();

  useEffect(() => {
    dispatch(getAllInsurance(auth));
  }, []);

  const initialValues = {
    first_name: userProfile?.first_name || "",
    second_name: userProfile?.last_name || "",
    date_of_birth: userProfile?.date_of_birth || "",
    gender: userProfile?.gender || "",
    insurance: userProfile?.insurance || null,
    user: auth?.user_id
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("First Name is required!"),
    second_name: Yup.string().required("Second Name is required!"),
    date_of_birth: Yup.string().required("Date is required!"),
    gender: Yup.string().required("Select gender!"),
    user: Yup.number(),
  });

  const mapInsuranceToBackendFormat = (insuranceName, insuranceList) => {
    const selectedInsurance = insuranceList.find(
      (item) => item.name === insuranceName
    );
    return selectedInsurance ? selectedInsurance.id : null;
  };

  const handleCreatePatient = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
        insurance: mapInsuranceToBackendFormat(formValue.insurance, insurance),
        user: parseInt(formValue.user),
        appointment_date_time: "",
        reason: "",
      };

      console.log("FORM DATA SAVING USER PATIENT", formData)
      setLoading(true);
      await createPatient(formData).then(() => {
        helpers.resetForm();
        toast.success("Profile Created Successfully!");
        setLoading(false);
        dispatch(getPatientProfile(auth, auth.user_id));
        dispatch(getAllPatients(auth));
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  const mapGenderToBackendFormat = (gender) => {
    if (gender === "Male") {
      return "M";
    } else if (gender === "Female") {
      return "F";
    }
    // Handle other cases or return a default value if needed
    return "";
  };

  return (
    <>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleCreatePatient}
      >
        <Form>
          <section className="grid grid-cols-2 items-center gap-4">
            <div className="my-2">
              <label className="text-sm" htmlFor="first_name">
                First Name
              </label>
              <Field
                className="border text-sm border-gray w-full focus:outline-none rounded-xl px-4 py-4"
                type="text"
                placeholder="First Name"
                name="first_name"
              />
              <ErrorMessage
                name="first_name"
                component="div"
                className="text-warning text-xs"
              />
            </div>
            <div className="my-2">
              <label className="text-sm" htmlFor="second_name">
                Last Name
              </label>
              <Field
                className="border text-sm border-gray w-full focus:outline-none rounded-xl px-4 py-4"
                type="text"
                placeholder="Second Name"
                name="second_name"
              />
              <ErrorMessage
                name="second_name"
                component="div"
                className="text-warning text-xs"
              />
            </div>
            <div className="my-2">
              <label className="text-sm" htmlFor="email">
                Date of Birth
              </label>
              <Field
                className="border text-sm border-gray w-full focus:outline-none rounded-xl px-4 py-4"
                type="date"
                placeholder="Date of Birth"
                name="date_of_birth"
              />
              <ErrorMessage
                name="date_of_birth"
                component="div"
                className="text-warning text-xs"
              />
            </div>
            <div className="my-2">
              <label className="text-sm" htmlFor="email">
                Gender
              </label>
              <Field
                as="select"
                className="border text-sm border-gray w-full focus:outline-none rounded-xl px-4 py-4"
                type="text"
                placeholder="gender"
                name="gender"
                value={
                  userProfile
                    ? mapGenderToBackendFormat(userProfile.gender)
                    : ""
                } // Map the gender value
              >
                <option value="">Select Gender</option>
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="O">Other</option>
              </Field>
              <ErrorMessage
                name="gender"
                component="div"
                className="text-warning text-xs"
              />
            </div>
            <div className="my-2">
              <label className="text-sm" htmlFor="email">
                Insurance
              </label>
              <Field
                as="select"
                className="border text-sm border-gray w-full focus:outline-none rounded-xl px-4 py-4"
                type="text"
                name="insurance"
              >
                <option value="">Select Insurance</option>
                {insurance.map((item) => (
                  <option key={item?.id} value={item.name}>
                    {item?.name}
                  </option>
                ))}py-2
                py-2
                py-2
                py-2
                py-2
                py-2
              </Field>
            </div>
          </section>
          <div className="flex items-center justify-start my-4">
            <button className="bg-primary text-white shadow-xl px-4 text-sm py-4 rounded-xl">
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
              Update Profile
            </button>
          </div>
        </Form>
      </Formik>
    </>
  );
};

export default PersonalDetails;

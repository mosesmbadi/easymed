import CustomizedLayout from "@/components/layout/customized-layout";
import { Container } from "@mui/material";
import React from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useRouter } from "next/router";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import AllPrescriptions from "@/components/dashboard/doctor-desk/prescriptions";
import Link from "next/link";

const Prescription = () => {
  const router = useRouter();
  const { data } = router.query;
  const [show, setShow] = React.useState(false);

  // Decode and parse the data back to the original object
  const decodedData = data ? JSON.parse(decodeURIComponent(data)) : null;


  const initialValues = {
    drug_name: "",
  };

  const handleSearch = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
        role: "doctor",
        profession: "",
        groups: [],
      };
      setLoading(true);
      await registerUser(formData, authUser).then(() => {
        helpers.resetForm();
        setLoading(false);
        handleClose();
        toast.success("Doctor Created Successfully!");
        dispatch(getAllDoctors(authUser));
      });
    } catch (err) {
      setLoading(false);
      toast.error(err);
    }
  };

  return (
    <Container maxWidth="xl" className="my-4">
      <Link href="/dashboard/doctor-desk" className="flex font-semibold text-xl items-center gap-2">
        <div>
          <MdOutlineKeyboardBackspace />
        </div>
        <div>
          <h1 className="">Back</h1>
        </div>
      </Link>
      <section className="flex items-center gap-2 mt-8">
        <div className="w-7/12">
          <input
            name="drug_name"
            placeholder="Prescription Id"
            className="block border  bg-background rounded-xl border-gray py-2 text-sm px-4 focus:outline-none w-full"
          />
        </div>
        <div>
          <button
            type="submit"
            className="bg-primary w-full rounded-xl px-4 text-sm py-2 text-white"
            onClick={() => setShow(true)}
          >
            Add Drug
          </button>
        </div>
      </section>
      { show && <AllPrescriptions patient={decodedData} /> }
    </Container>
  );
};

Prescription.getLayout = (page) => <CustomizedLayout>{page}</CustomizedLayout>;

export default Prescription;

import React from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import {createWard} from "@/redux/service/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";
import * as Yup from "yup";

const NewWard = () => {
  const initialValues = {
    name: "",
    capacity: "",
    ward_type: "",
    gender: "",
  };
  const auth = useAuth();
  

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("This field is required!"),
    capacity: Yup.string().required("This field is required!"),
    ward_type: Yup.string().required("This field is required!"),
    gender: Yup.string().required("This field is required!"),
  });

  const handleSubmit = async (formValue, helpers) => {
    try {
      const payload = {
        name: formValue.name,
        capacity: formValue.capacity,
        ward_type: formValue.ward_type,
        gender: formValue.gender
      };
      await createWard(payload,auth).then((res) => {
        console.log("WARD_RESPONSE ", res);
        helpers.resetForm();
        toast.success("Ward Added Successfully!");
        router.push('/dashboard/admit/wards');
      });
    } catch (err) {
      console.log("WARD_ERROR ", err);
    }
  };
  

  return (
    <section>
      <div className="flex items-center gap-4 mb-8">
        <img
          className="h-3 w-3 cursor-pointer"
          src="/images/svgs/back_arrow.svg"
          alt="go back"
        />
        <h3 className="text-xl">Add New Ward</h3>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form>
          <Grid container spacing={2}>
            <Grid className="my-2" item md={6} xs={12}>
              <label htmlFor="name">Ward Name</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
                placeholder="Ward Name"
                name="name"
              />
              <ErrorMessage
                name="name"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>

            <Grid className="my-2" item md={6} xs={12}>
              <label htmlFor="capacity">Capacity</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
                placeholder="Capacity"
                name="capacity"
              />
              <ErrorMessage
                name="capacity"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>

            <Grid className="my-2" item md={6} xs={12}>
              <label htmlFor="ward_type">Ward Type</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
                placeholder="Ward Type"
                name="ward_type"
              />
              <ErrorMessage
                name="ward_type"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>

            <Grid className="my-2" item md={6} xs={12}>
              <label htmlFor="gender">Gender</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 w-full"
                placeholder="Gender"
                name="gender"
              />
              <ErrorMessage
                name="gender"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>

            <Grid className="my-2" item md={12} xs={12}>
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="bg-primary rounded-xl text-sm px-8 py-2 text-white"
                >
                  Add Ward
                </button>
              </div>
            </Grid>
          </Grid>
        </Form>
      </Formik>
    </section>
  );
};

export default NewWard;

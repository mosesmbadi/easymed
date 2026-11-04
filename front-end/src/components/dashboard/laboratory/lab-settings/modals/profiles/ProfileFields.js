import React from "react";
import { ErrorMessage, Field } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";

const inputClass = "block border border-gray py-3 px-4 focus:outline-none w-full";

const emptyToNull = (value, original) => (original === "" ? null : value);

export const profileValidation = Yup.object().shape({
  name: Yup.string().required("Field is Required!"),
  sort_order: Yup.number()
    .transform((value, original) => (original === "" ? 0 : value))
    .typeError("Must be a number")
    .integer("Must be a whole number")
    .min(0, "Cannot be negative"),
  sale_price: Yup.number()
    .transform(emptyToNull)
    .nullable()
    .typeError("Must be a number")
    .min(0, "Cannot be negative"),
});

export const profilePayload = (values) => ({
  name: values.name,
  parent: values.parent ? Number(values.parent) : null,
  sort_order: parseInt(values.sort_order) || 0,
  sale_price: values.sale_price === "" ? null : values.sale_price,
});

/** The fields shared by adding and editing a profile. `parents` are the options for "Part of". */
const ProfileFields = ({ parents }) => (
  <Grid container spacing={2}>
    <Grid item md={6} xs={12}>
      <label htmlFor="name">Name</label>
      <Field id="name" className={inputClass} type="text" placeholder="e.g. Biochemistry" name="name" />
      <ErrorMessage name="name" component="div" className="text-warning text-xs" />
    </Grid>
    <Grid item md={6} xs={12}>
      <label htmlFor="parent">Part Of (Main Profile)</label>
      <Field id="parent" as="select" className={inputClass} name="parent">
        <option value="">None: this is a main profile</option>
        {parents.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.full_name || profile.name}
          </option>
        ))}
      </Field>
    </Grid>
    <Grid item md={6} xs={12}>
      <label htmlFor="sort_order">Report Order</label>
      <Field id="sort_order" className={inputClass} type="number" min="0" step="1" name="sort_order" />
      <p className="text-xs text-gray-500 mt-1">
        Lower numbers print first among profiles under the same main profile.
      </p>
      <ErrorMessage name="sort_order" component="div" className="text-warning text-xs" />
    </Grid>
    <Grid item md={6} xs={12}>
      <label htmlFor="sale_price">Sale Price</label>
      <Field id="sale_price" className={inputClass} type="number" min="0" step="0.01" name="sale_price" />
      <p className="text-xs text-gray-500 mt-1">
        Charged once when this profile is requested, on top of any price on its panels.
        Set it on the main profile and leave its panels at 0.
      </p>
      <ErrorMessage name="sale_price" component="div" className="text-warning text-xs" />
    </Grid>
  </Grid>
);

export default ProfileFields;

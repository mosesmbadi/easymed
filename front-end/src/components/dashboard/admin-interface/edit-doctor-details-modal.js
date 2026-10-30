import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Divider } from "@mui/material";
import { TextField, Autocomplete, Grid } from "@mui/material";
import { getAutoCompleteValue } from "@/assets/file-helper";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { BiEdit } from 'react-icons/bi';

const EditDoctorDetailsModal = ({ open,setOpen,selectedRowData }) => {
    console.log("ROW_DATA ",selectedRowData);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const gender = [
    {
      id: 1,
      name: "Male",
    },
    {
      id: 2,
      name: "Female",
    },
  ];

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("This field is required!"),
    second_name: Yup.string().required("This field is required!"),
    last_name: Yup.string().required("This field is required!"),
    date_of_birth: Yup.date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
    genderId: Yup.string().required("This field is required!"),
    telephone: Yup.string().required("This field is required!"),
    email: Yup.string().required("This field is required!"),
    residence: Yup.string().required("This field is required!"),
    provider: Yup.string().required("This field is required!"),
    card_number: Yup.string().required("This field is required!"),
    package: Yup.string().required("This field is required!"),
  });

  const formik = useFormik({
    initialValues: {
      first_name: "",
      second_name: "",
      last_name: "",
      date_of_birth: "",
      genderId: null,
      telephone: "",
      email: "",
      residence: "",
      provider: "",
      card_number: "",
      package: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      console.log("FORMIK_VALUES ", values);
      // await dispatch(createSponsorUser(authUser, values));
    },
  });

  const handleOnGenderId = (event, value) => {
    console.log(value);
    if (value !== null) {
      formik.setFieldValue("genderId", value.id);
    } else {
      formik.setFieldValue("genderId", null);
    }
  };

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <form onSubmit={formik.handleSubmit}>
            <section className="space-y-2">
              <h1 className="font-bold text-xl">Edit Doctor Details</h1>
              <Grid container spacing={2}>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="First Name"
                    name="first_name"
                    value={formik.values.first_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.first_name &&
                      Boolean(formik.errors.first_name)
                    }
                    helperText={
                      formik.touched.first_name && formik.errors.first_name
                    }
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Second Name"
                    name="second_name"
                    value={formik.values.second_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.second_name &&
                      Boolean(formik.errors.second_name)
                    }
                    helperText={
                      formik.touched.second_name && formik.errors.second_name
                    }
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Last Name"
                    name="last_name"
                    value={formik.values.last_name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.last_name &&
                      Boolean(formik.errors.last_name)
                    }
                    helperText={
                      formik.touched.last_name && formik.errors.last_name
                    }
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item md={4} xs={12}>
                  <DatePicker
                    size="small"
                    label="Date of Birth"
                    value={formik.values.date_of_birth}
                    onChange={(date) =>
                      formik.setFieldValue("date_of_birth", date)
                    }
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.date_of_birth &&
                      Boolean(formik.errors.date_of_birth)
                    }
                    helperText={
                      formik.touched.date_of_birth &&
                      formik.errors.date_of_birth
                    }
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <Autocomplete
                    options={gender}
                    value={getAutoCompleteValue(gender, formik.values.genderId)}
                    getOptionLabel={(option) => option.name}
                    onChange={handleOnGenderId}
                    renderInput={(params) => (
                      <TextField
                        size="small"
                        fullWidth
                        {...params}
                        label="Gender"
                        name="genderId"
                        onBlur={formik.handleBlur}
                        error={
                          formik.touched.genderId &&
                          Boolean(formik.errors.genderId)
                        }
                        helperText={
                          formik.touched.genderId && formik.errors.genderId
                        }
                      />
                    )}
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    // size="small"
                    label="Telephone"
                    name="telephone"
                    value={formik.values.telephone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.telephone &&
                      Boolean(formik.errors.telephone)
                    }
                    helperText={
                      formik.touched.telephone && formik.errors.telephone
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
              <p>Contact Information</p>
              <Grid container spacing={2}>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Email"
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Residence"
                    name="residence"
                    value={formik.values.residence}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.residence &&
                      Boolean(formik.errors.residence)
                    }
                    helperText={
                      formik.touched.residence && formik.errors.residence
                    }
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Provider"
                    name="provider"
                    value={formik.values.provider}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.provider && Boolean(formik.errors.provider)
                    }
                    helperText={
                      formik.touched.provider && formik.errors.provider
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
              <p>Insurance Information</p>
              <Grid container spacing={2}>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Card Number"
                    name="card_number"
                    value={formik.values.card_number}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.card_number &&
                      Boolean(formik.errors.card_number)
                    }
                    helperText={
                      formik.touched.card_number && formik.errors.card_number
                    }
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Package"
                    name="package"
                    value={formik.values.package}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={
                      formik.touched.package && Boolean(formik.errors.package)
                    }
                    helperText={formik.touched.package && formik.errors.package}
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <TextField
                    fullWidth
                    maxWidth="sm"
                    size="small"
                    label="Telephone"
                    name="telephone"
                  />
                </Grid>
              </Grid>
              <Divider />
              <div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="submit"
                    className="bg-[#02273D] px-4 py-2 text-white"
                  >
                    Save Patient
                  </button>
                  <button
                    type="submit"
                    onClick={handleClose}
                    className="border border-warning px-4 py-2 text-[#02273D]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EditDoctorDetailsModal;

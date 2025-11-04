import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup'
import { Grid } from '@mui/material';
import { ErrorMessage, Field, Form, Formik } from 'formik'

import { getCompanyDetails } from '@/redux/features/company';
import { updateCompanyInformation } from '@/redux/service/company';
import { useAuth } from '@/assets/hooks/use-auth';
import { toast } from 'react-toastify';

const CompanyDetails = () => {
    const dispatch = useDispatch();
    const auth = useAuth();
    const [ loading, setLoading ] = useState('');
    const companyInfo = useSelector((store)=>store.company.companyDetails);

    const initialValues = {
        name: companyInfo?.name,
        address1: companyInfo?.address1,
        address2: companyInfo?.address2,
        phone1: companyInfo?.phone1,
        phone2: companyInfo?.phone2,
        email1: companyInfo?.email1,
        email2: companyInfo?.email2,
        patient_id_prefix: companyInfo?.patient_id_prefix || '',
        logo: null,
    };
    
    const validationSchema = Yup.object().shape({
        name: Yup.string().required("First Name is required!"),
        address1: Yup.string().required("Address 1 is required!"),
        address2: Yup.string(),
        phone1: Yup.number().required("Phone is required!"),
        phone2: Yup.number(),
        email1: Yup.string().required("Email gender!"),
        email2: Yup.string(),
    });

    const updateCompanyInfo = async (formValue) => {
        setLoading(true)
        try{

            await updateCompanyInformation(formValue, auth);
            toast.success("Successfully updated company information");
            setLoading(false);

        }catch(e){
            setLoading(false);
            toast.error("Failed to Update company information", e);
        }

    }

    useEffect(()=> {
        if (auth){
            dispatch(getCompanyDetails(auth));
        }

    }, [auth])

  return (
    <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={updateCompanyInfo}
    >
        <Form>
            <section className="space-y-2 bg-white rounded-lg min-h-[80vh] p-2 flex flex-col gap-4 items-center justify-center">
                <div>
                    <h4 className='font-semibold my-2'>Basic Information</h4>
                    <Grid container spacing={2}>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Enter Company Name"
                                name="name"
                            />
                            <ErrorMessage
                                name="name"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Branch"
                                name="company_branch"
                            />
                            <ErrorMessage
                                name="company_branch"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="email"
                                placeholder="email 1"
                                name="email1"
                            />
                            <ErrorMessage
                                name="email1"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="email"
                                placeholder="email 2"
                                name="email2"
                            />
                            <ErrorMessage
                                name="email2"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="number"
                                placeholder="phone 1"
                                name="phone1"
                            />
                            <ErrorMessage
                                name="phone1"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="number"
                                placeholder="phone 2"
                                name="phone2"
                            />
                            <ErrorMessage
                                name="phone2"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Patient ID Prefix (e.g., ESMED-)
                            </label>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Enter patient ID prefix (e.g., ESMED-)"
                                name="patient_id_prefix"
                            />
                            <ErrorMessage
                                name="patient_id_prefix"
                                component="div"
                                className="text-warning text-xs"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This prefix will be added to all new patient IDs (e.g., ESMED-1, ESMED-2, etc.)
                            </p>
                        </Grid>
                    </Grid>
                </div>
                <div>
                    <h4 className='font-semibold my-2'>Address Information</h4>
                    <Grid container spacing={2}>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Enter street Name"
                                name="street"
                            />
                            <ErrorMessage
                                name="street"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Nairobi"
                                name="city"
                            />
                            <ErrorMessage
                                name="city"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Postal Code"
                                name="postal_code"
                            />
                            <ErrorMessage
                                name="postal_code"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Address 1"
                                name="address1"
                            />
                            <ErrorMessage
                                name="address1"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Field
                                className="block border border-gray py-3 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Address 2"
                                name="address2"
                            />
                            <ErrorMessage
                                name="address2"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                    </Grid>
                </div>
                <div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-primary px-4 py-2 text-white"
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
                      Update Information
                    </button>
                  </div>
                </div>

            </section>
        </Form>

  </Formik>
  )
}

export default CompanyDetails
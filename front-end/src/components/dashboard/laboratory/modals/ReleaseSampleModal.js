import React, { useState } from 'react'
import { Modal, Box, Grid, TextField, Typography, IconButton } from '@mui/material'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { FiX } from 'react-icons/fi'
import { useDispatch } from 'react-redux'

import { useAuth } from '@/assets/hooks/use-auth'
import { createReleasedSample, deletePatientSampleArchive } from '@/redux/service/laboratory'
import { getAllReleasedSamples, getAllPhlebotomySamples, getAllPatientSampleArchives } from '@/redux/features/laboratory'

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 560,
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    p: 0,
    outline: 'none',
}

const ReleaseSampleModal = ({ open, setOpen, selectedSample, archiveId = null }) => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false)

    const initialValues = {
        facility_name: '',
        receiving_lab_tech: '',
        reason: '',
        notes: '',
    }

    const validationSchema = Yup.object().shape({
        facility_name: Yup.string().required('Facility name is required'),
        receiving_lab_tech: Yup.string().required('Receiving lab technician is required'),
        reason: Yup.string(),
        notes: Yup.string(),
    })

    const handleSubmit = async (values, helpers) => {
        if (!selectedSample) return
        setLoading(true)
        try {
            const payload = {
                patient_sample: selectedSample.id,
                patient_sample_code: selectedSample.patient_sample_code,
                ...values,
            }
            await createReleasedSample(payload, auth)
            // If triggered from archive — delete the archive record
            if (archiveId) {
                try {
                    await deletePatientSampleArchive(archiveId, auth)
                    dispatch(getAllPatientSampleArchives(auth))
                } catch (err) {
                    console.error('Error deleting archive record:', err)
                }
            }
            dispatch(getAllReleasedSamples(auth))
            dispatch(getAllPhlebotomySamples(auth))
            toast.success('Sample released successfully')
            helpers.resetForm()
            setOpen(false)
        } catch (error) {
            console.error('Release error:', error)
            const errMsg = error?.response?.data
                ? Object.values(error.response.data).flat().join(' ')
                : 'Error releasing sample'
            toast.error(errMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <Box sx={style}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <Typography variant="h6" className="font-bold text-gray-800">
                            Release Sample
                        </Typography>
                        {selectedSample && (
                            <Typography variant="body2" className="text-gray-500 mt-0.5">
                                {selectedSample.patient_sample_code}
                            </Typography>
                        )}
                    </div>
                    <IconButton onClick={() => setOpen(false)} size="small">
                        <FiX className="text-gray-500" />
                    </IconButton>
                </div>

                {/* Form */}
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ values, handleChange, handleBlur }) => (
                        <Form>
                            <div className="px-6 py-5">
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Facility Name <span className="text-red-500">*</span>
                                        </label>
                                        <Field
                                            name="facility_name"
                                            as={TextField}
                                            fullWidth
                                            size="small"
                                            placeholder="e.g. Kenyatta National Hospital"
                                            value={values.facility_name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        <ErrorMessage
                                            name="facility_name"
                                            component="div"
                                            className="text-red-500 text-xs mt-1"
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Receiving Lab Technician <span className="text-red-500">*</span>
                                        </label>
                                        <Field
                                            name="receiving_lab_tech"
                                            as={TextField}
                                            fullWidth
                                            size="small"
                                            placeholder="Full name of receiving lab technician"
                                            value={values.receiving_lab_tech}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        <ErrorMessage
                                            name="receiving_lab_tech"
                                            component="div"
                                            className="text-red-500 text-xs mt-1"
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Reason for Release
                                        </label>
                                        <Field
                                            name="reason"
                                            as={TextField}
                                            fullWidth
                                            size="small"
                                            placeholder="e.g. Specialist analysis, referral..."
                                            value={values.reason}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Notes
                                        </label>
                                        <Field
                                            name="notes"
                                            as={TextField}
                                            fullWidth
                                            multiline
                                            rows={3}
                                            size="small"
                                            placeholder="Any additional notes..."
                                            value={values.notes}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                    </Grid>
                                </Grid>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-2 text-sm text-white bg-primary rounded-lg hover:opacity-90 transition flex items-center gap-2"
                                >
                                    {loading && (
                                        <svg
                                            className="animate-spin h-4 w-4 text-white"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12" cy="12" r="10"
                                                stroke="currentColor" strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8v8H4z"
                                            />
                                        </svg>
                                    )}
                                    Release Sample
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Box>
        </Modal>
    )
}

export default ReleaseSampleModal

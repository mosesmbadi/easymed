import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { Grid } from '@mui/material';
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { toast } from 'react-toastify';
import dynamic from "next/dynamic";
import { useAuth } from '@/assets/hooks/use-auth';
import { useDispatch, useSelector } from 'react-redux';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { AiOutlineDelete } from 'react-icons/ai';
import { getAllDrugModes } from '@/redux/features/pharmacy';
import { createDrugMode, deleteDrugMode } from '@/redux/service/pharmacy';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const DrugModes = () => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);
    const { drugModes } = useSelector((store) => store.prescription);

    const initialValues = {
        name: ""
    }

    const validationSchema = Yup.object().shape({
        name: Yup.string().required("Field is required!"),
    });

    const addNewMode = async (values, helpers) => {
        setLoading(true)
        try {
            await createDrugMode(values, auth)
            dispatch(getAllDrugModes(auth))
            setLoading(false)
            helpers.resetForm();
            toast.success('Mode created successfully')
        } catch (error) {
            setLoading(false)
            toast.error(error || 'Error Creating Mode')
        }
    }

    const handleDelete = async (data) => {
        try {
            await deleteDrugMode(data.id, auth)
            dispatch(getAllDrugModes(auth))
            toast.success('Mode deleted successfully')
        } catch (error) {
            toast.error(error || 'Error deleting mode')
        }
    }

    useEffect(() => {
        if (auth) {
            dispatch(getAllDrugModes(auth))
        }
    }, [auth])

    const actionsFunc = ({ data }) => {
        return (
            <div className="flex items-center gap-2">
                <AiOutlineDelete
                    onClick={() => handleDelete(data)}
                    className="cursor-pointer text-warning text-xl"
                />
            </div>
        );
    };

    return (
        <div className="bg-white p-4 rounded shadow">
            <h2 className='mb-4 font-bold text-xl'>Modes of Administration</h2>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={addNewMode}
            >
                <Form>
                    <Grid container spacing={2}>
                        <Grid item md={10} xs={12}>
                            <Field
                                className="block border border-gray py-2 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Mode Name (e.g. Oral, Injection)"
                                name="name"
                            />
                            <ErrorMessage
                                name="name"
                                component="div"
                                className="text-warning text-xs"
                            />
                        </Grid>
                        <Grid item md={2} xs={12}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary px-4 py-2 text-white w-full h-full"
                            >
                                {loading ? 'Adding...' : 'Add Mode'}
                            </button>
                        </Grid>
                    </Grid>
                </Form>
            </Formik>
            <div className='mt-8'>
                <DataGrid
                    dataSource={drugModes}
                    allowColumnReordering={true}
                    rowAlternationEnabled={true}
                    showBorders={true}
                    showColumnLines={true}
                    showRowLines={true}
                    wordWrapEnabled={true}
                    allowPaging={true}
                    className="shadow-sm"
                >
                    <Scrolling rowRenderingMode='virtual'></Scrolling>
                    <Paging defaultPageSize={10} />
                    <Pager
                        visible={true}
                        allowedPageSizes={allowedPageSizes}
                        showPageSizeSelector={true}
                        showInfo={true}
                        showNavigationButtons={true}
                    />
                    <Column dataField="name" caption="Name" />
                    <Column
                        dataField=""
                        caption="Action"
                        width={80}
                        cellRender={actionsFunc}
                    />
                </DataGrid>
            </div>
        </div>
    )
}

export default DrugModes

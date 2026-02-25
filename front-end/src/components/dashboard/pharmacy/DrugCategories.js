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
import { getAllDrugCategories } from '@/redux/features/pharmacy';
import { createDrugCategory, deleteDrugCategory } from '@/redux/service/pharmacy';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const DrugCategories = () => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);
    const { drugCategories } = useSelector((store) => store.prescription);
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);

    const initialValues = {
        name: "",
        description: ""
    }

    const validationSchema = Yup.object().shape({
        name: Yup.string().required("Field is required!"),
    });

    const addNewCategory = async (values, helpers) => {
        setLoading(true)
        try {
            await createDrugCategory(values, auth)
            dispatch(getAllDrugCategories(auth))
            setLoading(false)
            helpers.resetForm();
            toast.success('Category created successfully')
        } catch (error) {
            setLoading(false)
            toast.error(error || 'Error Creating Category')
        }
    }

    const handleDelete = async (data) => {
        try {
            await deleteDrugCategory(data.id, auth)
            dispatch(getAllDrugCategories(auth))
            toast.success('Category deleted successfully')
        } catch (error) {
            toast.error(error || 'Error deleting category')
        }
    }

    useEffect(() => {
        if (auth) {
            dispatch(getAllDrugCategories(auth))
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
            <h2 className='mb-4 font-bold text-xl'>Drug Categories</h2>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={addNewCategory}
            >
                <Form>
                    <Grid container spacing={2}>
                        <Grid item md={4} xs={12}>
                            <Field
                                className="block border border-gray py-2 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Category Name"
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
                                className="block border border-gray py-2 px-4 focus:outline-none w-full"
                                type="text"
                                placeholder="Description"
                                name="description"
                            />
                        </Grid>
                        <Grid item md={2} xs={12}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary px-4 py-2 text-white w-full h-full"
                            >
                                {loading ? 'Adding...' : 'Add Category'}
                            </button>
                        </Grid>
                    </Grid>
                </Form>
            </Formik>
            <div className='mt-8'>
                <DataGrid
                    dataSource={drugCategories}
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
                        showPageSizeSelector={showPageSizeSelector}
                        showInfo={showInfo}
                        showNavigationButtons={showNavButtons}
                    />
                    <Column dataField="name" caption="Name" />
                    <Column dataField="description" caption="Description" />
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

export default DrugCategories

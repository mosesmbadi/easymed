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
import { getAllDrugCategories, getAllDrugModes, getAllDrugStates, getAllDrugs } from '@/redux/features/pharmacy';
import { getItems } from '@/redux/features/inventory';
import { createDrug, deleteDrug } from '@/redux/service/pharmacy';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const Drugs = () => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);
    const { drugs, drugCategories, drugModes, drugStates } = useSelector((store) => store.prescription);
    const { items, item } = useSelector((store) => store.inventory);

    const initialValues = {
        item: "",
        category: "",
        mode: "",
        state: ""
    }

    const validationSchema = Yup.object().shape({
        item: Yup.string().required("Field is required!"),
        category: Yup.string().required("Field is required!"),
        mode: Yup.string().required("Field is required!"),
        state: Yup.string().required("Field is required!"),
    });

    const addNewDrug = async (values, helpers) => {
        setLoading(true)
        try {
            await createDrug(values, auth)
            dispatch(getAllDrugs(auth))
            setLoading(false)
            helpers.resetForm();
            toast.success('Drug details updated successfully')
        } catch (error) {
            setLoading(false)
            toast.error(error || 'Error adding drug details')
        }
    }

    const handleDelete = async (data) => {
        try {
            await deleteDrug(data.id, auth)
            dispatch(getAllDrugs(auth))
            toast.success('Drug details removed successfully')
        } catch (error) {
            toast.error(error || 'Error removing drug details')
        }
    }

    useEffect(() => {
        if (auth) {
            dispatch(getAllDrugs(auth))
            dispatch(getAllDrugCategories(auth))
            dispatch(getAllDrugModes(auth))
            dispatch(getAllDrugStates(auth))
            dispatch(getItems(auth))
        }
    }, [auth])

    const allItems = [...(items || []), ...(Array.isArray(item) ? item : [])];
    const drugItems = allItems.filter(i => i.category === 'Drug');

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
            <h2 className='mb-4 font-bold text-xl'>Drug Specifics</h2>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={addNewDrug}
            >
                <Form>
                    <Grid container spacing={2}>
                        <Grid item md={3} xs={12}>
                            <label className="text-xs">Inventory Item</label>
                            <Field
                                as="select"
                                className="block border border-gray py-2 px-4 focus:outline-none w-full text-sm"
                                name="item"
                            >
                                <option value="">Select Item</option>
                                {drugItems.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </Field>
                            <ErrorMessage name="item" component="div" className="text-warning text-xs" />
                        </Grid>
                        <Grid item md={3} xs={12}>
                            <label className="text-xs">Category</label>
                            <Field
                                as="select"
                                className="block border border-gray py-2 px-4 focus:outline-none w-full text-sm"
                                name="category"
                            >
                                <option value="">Select Category</option>
                                {drugCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </Field>
                            <ErrorMessage name="category" component="div" className="text-warning text-xs" />
                        </Grid>
                        <Grid item md={2} xs={12}>
                            <label className="text-xs">Mode</label>
                            <Field
                                as="select"
                                className="block border border-gray py-2 px-4 focus:outline-none w-full text-sm"
                                name="mode"
                            >
                                <option value="">Select Mode</option>
                                {drugModes.map(mode => (
                                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                                ))}
                            </Field>
                            <ErrorMessage name="mode" component="div" className="text-warning text-xs" />
                        </Grid>
                        <Grid item md={2} xs={12}>
                            <label className="text-xs">State</label>
                            <Field
                                as="select"
                                className="block border border-gray py-2 px-4 focus:outline-none w-full text-sm"
                                name="state"
                            >
                                <option value="">Select State</option>
                                {drugStates.map(state => (
                                    <option key={state.id} value={state.id}>{state.name}</option>
                                ))}
                            </Field>
                            <ErrorMessage name="state" component="div" className="text-warning text-xs" />
                        </Grid>
                        <Grid item md={2} xs={12} className="flex items-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary px-4 py-2 text-white w-full"
                            >
                                {loading ? 'Saving...' : 'Save Drug'}
                            </button>
                        </Grid>
                    </Grid>
                </Form>
            </Formik>
            <div className='mt-8'>
                <DataGrid
                    dataSource={drugs}
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
                    <Column dataField="item_name" caption="Drug Name" />
                    <Column dataField="category_name" caption="Category" />
                    <Column dataField="mode_name" caption="Mode" />
                    <Column dataField="state_name" caption="State" />
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

export default Drugs

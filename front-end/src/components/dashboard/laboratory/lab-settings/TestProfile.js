import React, { useEffect, useState } from 'react'
import { Form, Formik } from 'formik'
import { toast } from 'react-toastify';
import dynamic from "next/dynamic";

import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { useDispatch, useSelector } from 'react-redux';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { AiFillDelete } from 'react-icons/ai';
import { BiEdit } from 'react-icons/bi';
import { getAllLabTestProfiles } from '@/redux/features/laboratory';
import { createLabTestProfile } from '@/redux/service/laboratory';
import ForceDeleteDialog from '@/components/common/ForceDeleteDialog';
import { isAdmin } from '@/utils/permissions';
import EditTestProfileModal from './modals/profiles/EditProfileModal';
import ProfileFields, { profilePayload, profileValidation } from './modals/profiles/ProfileFields';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const initialValues = { name: "", parent: "", sort_order: 0, sale_price: "", orders_as_whole: false };

const TestProfile = () => {
    const auth = useAuth()
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { labTestProfiles } = useSelector((store) => store.laboratory);
    const [selectedRowData, setSelectedRowData] = useState({})

    const userActions = [
        { action: "update", label: "Edit Item", icon: <BiEdit className="text-success text-xl mx-2" /> },
        ...(isAdmin(auth)
            ? [{ action: "delete", label: "Delete", icon: <AiFillDelete className="text-warning text-xl mx-2" /> }]
            : []),
    ];

    const reload = () => dispatch(getAllLabTestProfiles(auth));

    const addNewProfile = async (values, helpers) => {
        setLoading(true)
        try {
            await createLabTestProfile(profilePayload(values), auth)
            reload();
            helpers.resetForm();
            toast.success('Profile created successfully')
        } catch (error) {
            toast.error('Error creating profile')
            console.log("ERR", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        reload();
    }, [])

    const onMenuClick = (menu, data) => {
        setSelectedRowData(data);
        if (menu.action === "update") setEditOpen(true);
        if (menu.action === "delete") setDeleteOpen(true);
    };

    const actionsFunc = ({ data }) => (
        <CmtDropdownMenu
            sx={{ cursor: "pointer" }}
            items={userActions}
            onItemClick={(menu) => onMenuClick(menu, data)}
            TriggerComponent={<LuMoreHorizontal className="cursor-pointer text-xl" />}
        />
    );

    return (
        <div>
            <h2 className='my-10 font-bold text-xl'>Add Profiles</h2>
            <Formik
                initialValues={initialValues}
                validationSchema={profileValidation}
                onSubmit={addNewProfile}
            >
                <Form>
                    <ProfileFields parents={labTestProfiles} />
                    <div className="flex justify-end mt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary px-4 py-2 text-white disabled:opacity-60"
                        >
                            {loading ? "Saving..." : "Add Profile"}
                        </button>
                    </div>
                </Form>
            </Formik>
            <div className='my-10'>
                <DataGrid
                    dataSource={labTestProfiles}
                    allowColumnReordering={true}
                    rowAlternationEnabled={true}
                    showBorders={true}
                    remoteOperations={true}
                    showColumnLines={true}
                    showRowLines={true}
                    wordWrapEnabled={true}
                    allowPaging={true}
                    className="shadow-xl"
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
                    <Column dataField="full_name" caption="Name" />
                    <Column dataField="sort_order" caption="Report Order" width={110} />
                    <Column
                        dataField="orders_as_whole"
                        caption="Ordered As"
                        width={130}
                        cellRender={({ data }) =>
                            data.locked_by
                                ? data.locked_by === data.id ? "Whole" : `Whole, with ${data.locked_by_name}`
                                : "Pick panels"
                        }
                    />
                    <Column
                        dataField="sale_price"
                        caption="Sale Price"
                        width={120}
                        cellRender={({ data }) =>
                            Number(data.sale_price) ? `Ksh ${Number(data.sale_price).toLocaleString()}` : "-"
                        }
                    />
                    <Column dataField="" caption="" width={50} cellRender={actionsFunc} />
                </DataGrid>
                <EditTestProfileModal open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData} />
                <ForceDeleteDialog
                    open={deleteOpen}
                    setOpen={setDeleteOpen}
                    resource="profile"
                    id={selectedRowData?.id}
                    name={selectedRowData?.name || "This profile"}
                    onDeleted={reload}
                />
            </div>
        </div>
    )
}

export default TestProfile

import React, { useEffect, useState } from 'react'
import * as Yup from 'yup'
import { Grid, FormControl, Select, MenuItem } from '@mui/material';
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { toast } from 'react-toastify';
import dynamic from "next/dynamic";

import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { useDispatch, useSelector } from 'react-redux';
import { Column, Pager, Paging, Scrolling, Lookup } from "devextreme-react/data-grid";
import { BiEdit } from 'react-icons/bi';
import { getAllPatientSampleArchives, getAllArchivePositions, getAllArchiveRacks, getAllArchiveSections, getAllArchiveComponents, getAllArchives, getAllPhlebotomySamples } from '@/redux/features/laboratory';
import { createPatientSampleArchive } from '@/redux/service/laboratory';
import EditPatientSampleArchiveModal from './modals/EditPatientSampleArchive';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
    let actions = [
        {
            action: "update",
            label: "Edit Item",
            icon: <BiEdit className="text-success text-xl mx-2" />,
        },
    ];

    return actions;
};

const PatientSampleArchive = () => {
    const auth = useAuth()
    const userActions = getActions();
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const { patientSampleArchives, archivePositions, archiveRacks, archiveSections, archiveComponents, archives, phlebotomySamples } = useSelector((store) => store.laboratory);
    const [selectedRowData, setSelectedRowData] = useState({})

    // Cascading dropdown states
    const [selectedArchive, setSelectedArchive] = useState("");
    const [selectedComponent, setSelectedComponent] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedRack, setSelectedRack] = useState("");

    // Filtered lists
    const filteredComponents = archiveComponents.filter(c => c.archive === selectedArchive);
    const filteredSections = archiveSections.filter(s => s.component === selectedComponent);
    const filteredRacks = archiveRacks.filter(r => r.section === selectedSection);
    const filteredPositions = archivePositions.filter(p => p.rack === selectedRack);

    const initialValues = {
        patient_sample: "",
        position: "",
        action: ""
    }

    const validationSchema = Yup.object().shape({
        patient_sample: Yup.number().required("Sample is required!"),
        position: Yup.number().required("Position is required!"),
    });

    const addNewArchive = async (values, helpers) => {
        setLoading(true)
        try {
            await createPatientSampleArchive(values, auth)
            dispatch(getAllPatientSampleArchives(auth))
            setLoading(false)
            helpers.resetForm();
            setSelectedArchive("");
            setSelectedComponent("");
            setSelectedSection("");
            setSelectedRack("");
            toast.success('Patient Sample Archive created successfully')
        } catch (error) {
            setLoading(false)
            toast.error('Error Creating Patient Sample Archive')
            console.log("ERR", error)
            if (error?.response?.data?.position) {
                toast.error(`Position Error: ${error.response.data.position[0]}`);
            }
        }
    }

    useEffect(() => {
        dispatch(getAllPatientSampleArchives(auth))
        dispatch(getAllArchivePositions(auth))
        dispatch(getAllArchiveRacks(auth))
        dispatch(getAllArchiveSections(auth))
        dispatch(getAllArchiveComponents(auth))
        dispatch(getAllArchives(auth))
        dispatch(getAllPhlebotomySamples(auth))
    }, [])

    const onMenuClick = async (menu, data) => {
        if (menu.action === "update") {
            setSelectedRowData(data);
            setEditOpen(true);
        }
    };

    const actionsFunc = ({ data }) => {
        return (
            <>
                <CmtDropdownMenu
                    sx={{ cursor: "pointer" }}
                    items={userActions}
                    onItemClick={(menu) => onMenuClick(menu, data)}
                    TriggerComponent={
                        <LuMoreHorizontal className="cursor-pointer text-xl" />
                    }
                />
            </>
        );
    };

    return (
        <div className='p-4'>
            <h2 className='my-6 font-bold text-xl'>Archive a Patient Sample</h2>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={addNewArchive}
            >
                {({ values, handleChange, handleBlur }) => (
                    <Form>
                        <Grid container spacing={2}>
                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        name="patient_sample"
                                        value={values.patient_sample}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        displayEmpty
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="" disabled>Select Patient Sample</MenuItem>
                                        {phlebotomySamples.map((ps) => (
                                            <MenuItem key={ps.id} value={ps.id}>
                                                {ps.patient_sample_code || `Sample #${ps.id}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <ErrorMessage
                                    name="patient_sample"
                                    component="div"
                                    className="text-warning text-xs"
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        value={selectedArchive}
                                        onChange={(e) => {
                                            setSelectedArchive(e.target.value);
                                            setSelectedComponent("");
                                            setSelectedSection("");
                                            setSelectedRack("");
                                            handleChange({ target: { name: 'position', value: '' } }); // Reset position
                                        }}
                                        displayEmpty
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="">Select Archive (Filter)</MenuItem>
                                        {archives.map((a) => (
                                            <MenuItem key={a.id} value={a.id}>
                                                {a.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        value={selectedComponent}
                                        onChange={(e) => {
                                            setSelectedComponent(e.target.value);
                                            setSelectedSection("");
                                            setSelectedRack("");
                                            handleChange({ target: { name: 'position', value: '' } }); // Reset position
                                        }}
                                        displayEmpty
                                        disabled={!selectedArchive}
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="">Select Component (Filter)</MenuItem>
                                        {filteredComponents.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>
                                                {c.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        value={selectedSection}
                                        onChange={(e) => {
                                            setSelectedSection(e.target.value);
                                            setSelectedRack("");
                                            handleChange({ target: { name: 'position', value: '' } }); // Reset position
                                        }}
                                        displayEmpty
                                        disabled={!selectedComponent}
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="">Select Section (Filter)</MenuItem>
                                        {filteredSections.map((s) => (
                                            <MenuItem key={s.id} value={s.id}>
                                                {s.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        value={selectedRack}
                                        onChange={(e) => {
                                            setSelectedRack(e.target.value);
                                            handleChange({ target: { name: 'position', value: '' } }); // Reset position
                                        }}
                                        displayEmpty
                                        disabled={!selectedSection}
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="">Select Rack (Filter)</MenuItem>
                                        {filteredRacks.map((r) => (
                                            <MenuItem key={r.id} value={r.id}>
                                                {r.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item md={4} xs={12}>
                                <FormControl fullWidth>
                                    <Select
                                        name="position"
                                        value={values.position}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        displayEmpty
                                        disabled={!selectedRack}
                                        className="block border border-gray w-full"
                                    >
                                        <MenuItem value="" disabled>Select Position *</MenuItem>
                                        {filteredPositions.map((pos) => (
                                            <MenuItem key={pos.id} value={pos.id}>
                                                {pos.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <ErrorMessage
                                    name="position"
                                    component="div"
                                    className="text-warning text-xs"
                                />
                            </Grid>

                            <Grid item md={12} xs={12}>
                                <div className="flex justify-end gap-2 h-full">
                                    <button
                                        type="submit"
                                        className="bg-primary px-4 py-2 text-white w-48 h-[54px] rounded-lg"
                                    >
                                        {loading && (
                                            <svg
                                                aria-hidden="true"
                                                role="status"
                                                className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
                                        Archive
                                    </button>
                                </div>
                            </Grid>
                        </Grid>
                    </Form>
                )}
            </Formik>
            <div className='my-10'>
                <DataGrid
                    dataSource={patientSampleArchives}
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
                        showPageSizeSelector={showPageSizeSelector}
                        showInfo={showInfo}
                        showNavigationButtons={showNavButtons}
                    />
                    <Column
                        dataField="patient_sample"
                        caption="Sample"
                        cellRender={(data) => {
                            const sample = phlebotomySamples.find(ps => ps.id === data.value);
                            return sample ? (sample.patient_sample_code || `Sample #${data.value}`) : data.value;
                        }}
                    />
                    <Column
                        dataField="position"
                        caption="Position"
                        cellRender={(data) => {
                            const position = archivePositions.find(p => p.id === data.value);
                            return position ? `${position.rack_name ? `[${position.rack_name}] ` : ''}${position.name}` : data.value;
                        }}
                    />
                    <Column
                        dataField="archiving_date"
                        caption="Archiving Date"
                    />
                    <Column
                        dataField="expiry_date"
                        caption="Expiry Date"
                    />
                    <Column
                        dataField="status"
                        caption="Status"
                    />
                    <Column
                        dataField="action"
                        caption="Action"
                    />
                    <Column
                        dataField=""
                        caption=""
                        width={50}
                        cellRender={actionsFunc}
                    />
                </DataGrid>
                <EditPatientSampleArchiveModal open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData} />
            </div>
        </div>
    )
}

export default PatientSampleArchive

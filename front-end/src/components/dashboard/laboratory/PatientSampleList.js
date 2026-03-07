import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from 'react-redux';
import { LuMoreHorizontal } from 'react-icons/lu';
import { BiPaperPlane } from 'react-icons/bi';

import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { getAllPhlebotomySamples, getAllReleasedSamples } from '@/redux/features/laboratory';
import { getAllProcesses, getAllPatients } from '@/redux/features/patients';
import ReleaseSampleModal from './modals/ReleaseSampleModal';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => [
    {
        action: 'release',
        label: 'Release Sample',
        icon: <BiPaperPlane className="text-primary text-xl mx-2" />,
    },
];

const PatientSampleList = () => {
    const auth = useAuth();
    const dispatch = useDispatch();
    const [showPageSizeSelector] = useState(true);
    const [showInfo] = useState(true);
    const [showNavButtons] = useState(true);
    const [releaseOpen, setReleaseOpen] = useState(false);
    const [selectedSample, setSelectedSample] = useState(null);

    const { phlebotomySamples, releasedSamples } = useSelector((store) => store.laboratory);
    const { processes, patients } = useSelector((store) => store.patient);

    const userActions = getActions();

    // Set of released patient_sample IDs for fast lookup
    const releasedIds = new Set(releasedSamples.map(rs => rs.patient_sample));

    // Only collected & not released
    const collectedSamples = phlebotomySamples
        .filter(ps => ps.is_sample_collected && !releasedIds.has(ps.id))
        .map(ps => {
            const process = processes.find(p => p.id === ps.process);
            const patient = process ? patients.find(pt => pt.id === process.patient) : null;
            return {
                ...ps,
                track_number: process ? process.reference : '',
                patient_name: patient ? `${patient.first_name} ${patient.second_name}` : '',
                patient_id: process ? process.patient_number : '',
            };
        });

    useEffect(() => {
        dispatch(getAllPhlebotomySamples(auth));
        dispatch(getAllReleasedSamples(auth));
        dispatch(getAllProcesses(auth));
        dispatch(getAllPatients(auth));
    }, []);

    const onMenuClick = (menu, data) => {
        if (menu.action === 'release') {
            setSelectedSample(data);
            setReleaseOpen(true);
        }
    };

    const actionsFunc = ({ data }) => (
        <CmtDropdownMenu
            sx={{ cursor: 'pointer' }}
            items={userActions}
            onItemClick={(menu) => onMenuClick(menu, data)}
            TriggerComponent={<LuMoreHorizontal className="cursor-pointer text-xl" />}
        />
    );

    return (
        <div className='p-4'>
            <h2 className='my-6 font-bold text-xl'>Patient Samples</h2>
            <DataGrid
                dataSource={collectedSamples}
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
                <Column dataField="patient_sample_code" caption="Sample Code" />
                <Column dataField="patient_id" caption="Patient ID" />
                <Column dataField="patient_name" caption="Patient Name" />
                <Column dataField="track_number" caption="Process Track No." />
                <Column dataField="specimen_name" caption="Specimen" />
                <Column dataField="collected_on" caption="Collected On" />
                <Column dataField="is_retested" caption="Retested" dataType="boolean" />
                <Column
                    caption=""
                    width={50}
                    cellRender={actionsFunc}
                />
            </DataGrid>

            <ReleaseSampleModal
                open={releaseOpen}
                setOpen={setReleaseOpen}
                selectedSample={selectedSample}
            />
        </div>
    );
};

export default PatientSampleList;

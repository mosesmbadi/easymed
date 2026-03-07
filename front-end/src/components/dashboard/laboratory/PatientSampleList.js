import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '@/assets/hooks/use-auth';
import { getAllPhlebotomySamples } from '@/redux/features/laboratory';
import { getAllProcesses, getAllPatients } from '@/redux/features/patients';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const PatientSampleList = () => {
    const auth = useAuth();
    const dispatch = useDispatch();
    const [showPageSizeSelector] = useState(true);
    const [showInfo] = useState(true);
    const [showNavButtons] = useState(true);
    const { phlebotomySamples } = useSelector((store) => store.laboratory);
    const { processes, patients } = useSelector((store) => store.patient);

    // Show only collected samples
    const collectedSamples = phlebotomySamples
        .filter(ps => ps.is_sample_collected)
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
        dispatch(getAllProcesses(auth));
        dispatch(getAllPatients(auth));
    }, []);

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
                <Column
                    dataField="patient_sample_code"
                    caption="Sample Code"
                />
                <Column
                    dataField="patient_id"
                    caption="Patient ID"
                />
                <Column
                    dataField="patient_name"
                    caption="Patient Name"
                />
                <Column
                    dataField="track_number"
                    caption="Process Track No."
                />
                <Column
                    dataField="specimen_name"
                    caption="Specimen"
                />
                <Column
                    dataField="collected_on"
                    caption="Collected On"
                />
                <Column
                    dataField="is_retested"
                    caption="Retested"
                    dataType="boolean"
                />
            </DataGrid>
        </div>
    );
};

export default PatientSampleList;

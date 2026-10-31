import React, { useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import { LuMoreHorizontal } from 'react-icons/lu';
import { BiPaperPlane } from 'react-icons/bi';

import { useServerList } from '@/assets/hooks/use-server-list';
import ServerPager from '@/components/common/ServerPager';
import { fetchSamplesPage } from '@/redux/service/laboratory';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import ReleaseSampleModal from './modals/ReleaseSampleModal';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const getActions = () => [
    {
        action: 'release',
        label: 'Release Sample',
        icon: <BiPaperPlane className="text-primary text-xl mx-2" />,
    },
];

const PatientSampleList = () => {
    const [releaseOpen, setReleaseOpen] = useState(false);
    const [selectedSample, setSelectedSample] = useState(null);
    const [search, setSearch] = useState('');

    // Drawn and not yet released, filtered, searched and paged on the server.
    // Each sample says whose it is, so no visit or patient list is needed.
    const samples = useServerList(fetchSamplesPage, {
        is_sample_collected: 'true',
        released: 'false',
        search,
    });

    const userActions = getActions();

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
            <div className='flex flex-wrap items-center justify-between gap-4 my-6'>
                <h2 className='font-bold text-xl'>Patient Samples</h2>
                <input
                    className='border border-gray rounded-xl py-2 px-4 text-sm focus:outline-none w-full max-w-sm'
                    placeholder='Search by sample code, patient or track number'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <DataGrid
                dataSource={samples.rows}
                noDataText={samples.loading ? 'Loading...' : samples.error || 'No samples waiting'}
                allowColumnReordering={true}
                rowAlternationEnabled={true}
                showBorders={true}
                showColumnLines={true}
                showRowLines={true}
                wordWrapEnabled={true}
                className="shadow-xl"
            >
                <Scrolling rowRenderingMode='virtual'></Scrolling>
                {/* The server sends one page; ServerPager below asks for others. */}
                <Paging enabled={false} />
                <Column dataField="patient_sample_code" caption="Sample Code" />
                <Column dataField="patient_number" caption="Patient ID" />
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
            <ServerPager
                page={samples.page}
                pageSize={samples.pageSize}
                total={samples.total}
                loading={samples.loading}
                onPageChange={samples.setPage}
                onPageSizeChange={samples.setPageSize}
            />

            <ReleaseSampleModal
                open={releaseOpen}
                setOpen={setReleaseOpen}
                selectedSample={selectedSample}
                onReleased={samples.refresh}
            />
        </div>
    );
};

export default PatientSampleList;

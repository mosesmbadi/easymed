import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllReleasedSamples } from '@/redux/features/laboratory';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const ReleasedSamples = () => {
    const auth = useAuth();
    const dispatch = useDispatch();
    const [showPageSizeSelector] = useState(true);
    const [showInfo] = useState(true);
    const [showNavButtons] = useState(true);

    const { releasedSamples } = useSelector((store) => store.laboratory);

    useEffect(() => {
        dispatch(getAllReleasedSamples(auth));
    }, []);

    return (
        <div className='p-4'>
            <h2 className='my-6 font-bold text-xl'>Released Patient Samples</h2>
            <DataGrid
                dataSource={releasedSamples}
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
                <Column dataField="facility_name" caption="Facility Name" />
                <Column dataField="receiving_lab_tech" caption="Receiving Lab Tech" />
                <Column dataField="released_on" caption="Released On" cellRender={(cellData) => new Date(cellData.data.released_on).toLocaleString()} />
                <Column dataField="reason" caption="Reason" />
                <Column dataField="notes" caption="Notes" />
            </DataGrid>
        </div>
    );
};

export default ReleasedSamples;

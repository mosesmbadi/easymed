import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import Link from "next/link";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const Ward = () => {
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <section>
            <h3 className="text-xl mt-8">Wards</h3>
            <Grid className="my-2 flex justify-between gap-4">
                <Grid className="w-full bg-white px-2 flex items-center rounded-lg" item md={4} xs={4}>
                    <img className="h-4 w-4" src='/images/svgs/search.svg' />
                    <input
                        className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        value={searchQuery}
                        placeholder="Search item"
                    />
                </Grid>
                <Grid className="w-full bg-primary rounded-md flex items-center text-white" item md={4} xs={4}>
                    <Link className="mx-4 w-full text-center" href="/dashboard/admit/new">
                        Add New Ward
                    </Link>
                </Grid>
            </Grid>
            <DataGrid
                dataSource={[]} // empty data
                allowColumnReordering={true}
                rowAlternationEnabled={true}
                showBorders={true}
                remoteOperations={true}
                showColumnLines={true}
                showRowLines={true}
                wordWrapEnabled={true}
                allowPaging={true}
                className="shadow-xl w-full"
            >
                <HeaderFilter visible={true} />
                <Scrolling rowRenderingMode="virtual" />
                <Paging defaultPageSize={10} />
                <Pager
                    visible={true}
                    allowedPageSizes={allowedPageSizes}
                    showPageSizeSelector={true}
                    showInfo={true}
                    showNavigationButtons={true}
                />
                <Column
                    dataField="ward_name"
                    caption="Ward Name"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column
                    dataField="capacity"
                    caption="Capacity"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column
                    dataField="nurse"
                    caption="Nurse"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column dataField="ward_type" caption="Ward Type" width={200} />
                <Column dataField="gender" caption="Gender" />
            </DataGrid>
        </section>
    );
};

export default Ward;

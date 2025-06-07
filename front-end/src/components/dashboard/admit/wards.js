import React from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { getAllWards } from "@/redux/features/wards";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const Ward = () => {
    return (
        <section>
            <h3 className="text-xl mt-8">Wards</h3>
            <div className="my-2 flex justify-between gap-4">
                <div className="w-full bg-white px-2 flex items-center rounded-lg">
                    <img className="h-4 w-4" src="/images/svgs/search.svg" alt="search icon" />
                    <input
                        className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
                        placeholder="Search Ward"
                    />
                </div>
                <div className="w-full bg-primary rounded-md flex items-center text-white justify-center cursor-pointer">
                    Add New Ward
                </div>
            </div>

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
                    dataField="patient_number"
                    caption="Ward Name"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column
                    dataField="patient"
                    caption="Capacity"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column
                    dataField="patient"
                    caption="Nurse"
                    allowFiltering={true}
                    allowSearch={true}
                />
                <Column dataField="reason" caption="Ward Type" width={200} />
                <Column dataField="actions" caption="Gender" />
            </DataGrid>
        </section>
    );
};

export default Ward;

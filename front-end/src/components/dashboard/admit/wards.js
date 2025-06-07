import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useDispatch, useSelector } from "react-redux";
import { getAllWards } from "@/redux/features/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

const allowedPageSizes = [5, 10, "all"];

const Ward = () => {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dispatch = useDispatch();
  const auth = useAuth();
  const { inpatients, wards } = useSelector((state) => state.inpatient);
  

  useEffect(() => {
    setMounted(true);
    if (auth.token) {
      dispatch(getAllWards(auth));
    }
  }, [auth]);

  if (!mounted) return null; 

  const filteredWards =
    wards?.filter((ward) =>
      ward?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <section>
      <h3 className="text-xl mt-8">Wards</h3>
      <div className="my-2 flex justify-between gap-4">
        <div className="w-full bg-white px-2 flex items-center rounded-lg">
          <img className="h-4 w-4" src="/images/svgs/search.svg" alt="search icon" />
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            placeholder="Search Ward"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full bg-primary rounded-md flex items-center text-white justify-center cursor-pointer">
          Add New Ward
        </div>
      </div>

      <DataGrid
        dataSource={filteredWards}
        allowColumnReordering
        rowAlternationEnabled
        showBorders
        remoteOperations
        showColumnLines
        showRowLines
        wordWrapEnabled
        allowPaging
        className="shadow-xl w-full"
      >
        <HeaderFilter visible />
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={10} />
        <Pager
          visible
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector
          showInfo
          showNavigationButtons
        />
        <Column dataField="name" caption="Ward Name" />
        <Column dataField="capacity" caption="Capacity" />
        <Column dataField="nurse" caption="Nurse" />
        <Column dataField="ward_type" caption="Ward Type" width={200} />
        <Column dataField="gender" caption="Gender" />
        {/* <Column dataField caption="Action" cellRender={actionsFunc}/> */}
      </DataGrid>
    </section>
  );
};

export default Ward;

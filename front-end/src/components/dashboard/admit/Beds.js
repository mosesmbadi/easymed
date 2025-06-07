import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useAuth } from '@/assets/hooks/use-auth'
import { useDispatch, useSelector } from 'react-redux';
import { fetchHospitalBeds } from '@/redux/features/inpatient';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const WardBeds = () => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const { beds } = useSelector((store) => store.inpatient);
  const auth = useAuth()
  const dispatch = useDispatch()

  const fetchTheBeds = async () => {
    try{
      dispatch(fetchHospitalBeds(auth))
    }catch(error){
      console.error("Error fetching beds:", error);
    }
  }

  const bedWard = (rowData) => {
    return rowData.data.ward.name;
  }

  useEffect(()=>{
    if(auth.token){
      fetchTheBeds()
    }
  }, [])

  return (
    <section className="mt-4">
      <DataGrid
        dataSource={beds}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={false}
        className="shadow-xl w-full"
      >
        <HeaderFilter visible={true} />
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          showInfo={showInfo}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showNavigationButtons={showNavButtons}
        />
        <Column 
          dataField="bed_number" 
          caption="Bed Number" 
        />
        <Column 
          dataField="bed_type" 
          caption="Bed Type" 
        />
        <Column
          dataField="ward"
          caption="Ward"
          cellRender={bedWard}
        />
        <Column
          dataField="status"
          caption="Status"
        />
      </DataGrid>
    </section>
  )
}

export default WardBeds
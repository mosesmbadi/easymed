import React, { useEffect, useState } from 'react'
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useAuth } from '@/assets/hooks/use-auth'
import { useDispatch, useSelector } from 'react-redux';
import { fetchHospitalBeds } from '@/redux/features/inpatient';
import { useParams } from 'next/navigation';
import AddWardBed from './modals/AddWardBed';
import { BiEdit } from 'react-icons/bi';
import { LuMoreHorizontal } from 'react-icons/lu';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import EditWard from './modals/EditWard';
import EditWardBed from './modals/EditWardBed';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Update Bed",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const WardBeds = () => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedRowData,setSelectedRowData] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const { beds } = useSelector((store) => store.inpatient);
  const auth = useAuth();
  const dispatch = useDispatch();
  const params = useParams();

  const userActions = getActions();

    const onMenuClick = async (menu, data) => {
     if(menu.action === "update"){
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

  const fetchTheBeds = async () => {
    try{
      dispatch(fetchHospitalBeds(auth, params.ward_id));
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
      <div className="flex items-center justify-between mb-2">
        <AddWardBed />
      </div>
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
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {editOpen && (
        <EditWardBed
          open={editOpen}
          setOpen={setEditOpen}
          selectedRowData={selectedRowData}
        />
      )}
    </section>
  )
}

export default WardBeds
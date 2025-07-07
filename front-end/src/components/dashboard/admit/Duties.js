import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { fetchAssignedNursesDuties } from "@/redux/features/inpatient";
import { useRouter } from 'next/navigation'
import { BiEdit } from "react-icons/bi";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import EditWard from "./modals/EditWard";
import NurseDuties from "./modals/NurseDutiesModal";
import UpdateNurseDuties from "./modals/UpdateNurseDutiesModal";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Reassign Nurse",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const NursesDuties = ({ ward_id = "" }) => {
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [selectedRowData,setSelectedRowData] = useState({});
    const [editOpen, setEditOpen] = useState(false);
    const { assignedNurses } = useSelector((store) => store.inpatient);
    const auth = useAuth()
    const dispatch = useDispatch()
    const router = useRouter();
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

    useEffect(() => {

        const fetchAssignedNurses = () => {
            try {
                dispatch(fetchAssignedNursesDuties(auth, ward_id));
            } catch (error) {
                console.error("Error fetching assigned nurses:", error);
            }
        };

        if(auth.token){
            fetchAssignedNurses();            
        }


    },[])

    return (
        <section>
            <h3 className="text-xl mt-8">Nurses Duties</h3>
            <div className="my-2 flex justify-between gap-4">
                <div className="w-full bg-white px-2 flex items-center rounded-lg">
                    <img className="h-4 w-4" src="/images/svgs/search.svg" alt="search icon" />
                    <input
                        className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
                        placeholder="Search Ward"
                    />
                </div>
                <div className="w-full bg-primary rounded-md flex items-center text-white justify-center cursor-pointer">
                    <NurseDuties/>
                </div>
            </div>

            <DataGrid
                dataSource={assignedNurses} // empty data
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
                    showInfo={showInfo}
                    allowedPageSizes={allowedPageSizes}
                    showPageSizeSelector={showPageSizeSelector}
                    showNavigationButtons={showNavButtons}
                />
                <Column
                  dataField="nurse"
                  caption="Nurse Name"
                  allowFiltering={true}
                  allowSearch={true}
                />
                <Column
                  dataField="ward"
                  caption="Ward Name"
                  allowFiltering={true}
                  allowSearch={true}
                />
                <Column
                    dataField=""
                    caption=""
                    cellRender={actionsFunc}
                />
            </DataGrid>
            {editOpen && (
                <UpdateNurseDuties
                    open={editOpen}
                    setOpen={setEditOpen}
                    selectedRowData={selectedRowData}
                />
            )}
        </section>
    );
};

export default NursesDuties;

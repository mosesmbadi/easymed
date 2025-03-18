import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { AiFillDelete } from "react-icons/ai";
import { BiEdit } from "react-icons/bi";
import { LuMoreHorizontal } from "react-icons/lu";
import EditUserDetailsModal from "./edit-user-details-modal";
import DeleteUserModal from "./delete-user-modal";
import AdminCreateUser from "./admin-create-user";
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "@/assets/hooks/use-auth";
import { getAllTheUsers } from "@/redux/features/users";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "delete",
      label: "Delete",
      icon: <AiFillDelete className="text-warning text-xl mx-2" />,
    },
    {
      action: "edit",
      label: "Edit",
      icon: <BiEdit className="text-xl text-success  mx-2" />,
    },
  ];

  return actions;
};

const AdminUsersDataGrid = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const [open, setOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const users = useSelector((store)=> store.user.users);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  useEffect(()=> {
    if (auth){
      dispatch(getAllTheUsers(auth));
    }

  }, [auth])

  console.log("ALL THE USERS", users)

  const onMenuClick = async (menu, data) => {
    if (menu.action === "delete") {
      setSelectedRowData(data);
      setDeleteOpen(true);
    } else if (menu.action === "edit") {
      setSelectedRowData(data);
      setOpen(true);
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

  //   filter users based on search query
  const filteredUser = users.filter((user) => {
    return user.first_name.toLocaleLowerCase().includes(searchQuery.toLowerCase()) || user.last_name.toLocaleLowerCase().includes(searchQuery.toLowerCase())
  });

  return (
    <section>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="flex items-center rounded-lg bg-white px-2 w-full" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg'/>
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search by name"
          />
        </Grid>
        <div className="w-full flex justify-end">
          <AdminCreateUser />
        </div>
      </Grid>
      <DataGrid
        dataSource={filteredUser}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        // height={"70vh"}
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
        <Column dataField="first_name" caption="First Name" width={100} />
        <Column dataField="last_name" caption="Last Name" width={100} />
        <Column
          dataField="email"
          caption="Email"
          width={200}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="age" caption="Age" width={100} />
        <Column dataField="phone" caption="Phone Number" width={200} />
        <Column dataField="profession" caption="Proffession" width={200} />
        <Column dataField="role" caption="Role" width={140} />
        <Column
          dataField=""
          caption=""
          width={80}
          cellRender={actionsFunc}
        />
      </DataGrid>
      <EditUserDetailsModal {...{ open, setOpen, selectedRowData }} />
      <DeleteUserModal {...{ deleteOpen, setDeleteOpen, selectedRowData }} />
    </section>
  );
};

export default AdminUsersDataGrid;

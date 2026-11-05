import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { AiFillDelete } from "react-icons/ai";
import { BiEdit } from "react-icons/bi";
import { LuMoreHorizontal } from "react-icons/lu";
import { TbFlask } from "react-icons/tb";
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "@/assets/hooks/use-auth";
import { getAllLabTestPanels } from "@/redux/features/laboratory";
import CreateTestPanelModal from "./modals/panels/CreateTestPanel";
import EditTestPanelModal from "./modals/panels/editTestPanel";
import ManagePanelReagents from "./modals/panels/ManagePanelReagents";
import ForceDeleteDialog from "@/components/common/ForceDeleteDialog";
import { isAdmin } from "@/utils/permissions";

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
    {
      action: "reagents",
      label: "Reagents",
      icon: <TbFlask className="text-xl text-primary mx-2" />,
    },
  ];

  return actions;
};

const TestPanels = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions().filter((row) => row.action !== "delete" || isAdmin(auth));
  const [open, setOpen] = React.useState(false);
  const [reagentsOpen, setReagentsOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const { labTestPanels } = useSelector((store) => store.laboratory);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  useEffect(() => {
    if (auth) {
      dispatch(getAllLabTestPanels(auth));
    }

  }, [auth])


  const onMenuClick = async (menu, data) => {
    if (menu.action === "delete") {
      setSelectedRowData(data);
      setDeleteOpen(true);
    } else if (menu.action === "edit") {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === "reagents") {
      setSelectedRowData(data);
      setReagentsOpen(true);
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

  //   filter Panels based on search query
  const filteredPanels = labTestPanels.filter((panel) => {
    if (showIncompleteOnly && !panel.missing_setup?.length) return false;
    return panel.name.toLowerCase().includes(searchQuery.toLowerCase())
  });

  const incompleteCount = labTestPanels.filter((panel) => panel.missing_setup?.length).length;

  return (
    <section>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="flex items-center rounded-lg bg-white px-2 w-full" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg' />
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search by name"
          />
        </Grid>
        <div className="w-full flex justify-end">
          <CreateTestPanelModal />
        </div>
      </Grid>
      {(incompleteCount > 0 || showIncompleteOnly) && (
        <div className="my-2 flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-2 text-sm">
          <span className="text-warning">
            {incompleteCount} {incompleteCount === 1 ? "panel is" : "panels are"} missing a unit or reference
            range. Results print with those columns blank, and are not flagged High or Low, until these are added.
          </span>
          <button
            type="button"
            onClick={() => setShowIncompleteOnly((current) => !current)}
            className="shrink-0 rounded-xl border border-primary px-3 py-1 text-xs text-primary"
          >
            {showIncompleteOnly ? "Show all panels" : "Show these panels"}
          </button>
        </div>
      )}
      <DataGrid
        dataSource={filteredPanels}
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
        <Column dataField="name" caption="Name" />
        <Column dataField="test_profile_full_name" caption="Profile" />
        <Column dataField="sort_order" caption="Order" width={70} />
        <Column dataField="specimen_name" caption="Specimen" />
        <Column
          dataField="sale_price"
          caption="Sale Price"
          cellRender={({ data }) =>
            Number(data.sale_price)
              ? `Ksh ${Number(data.sale_price).toLocaleString()}`
              : <span className="text-gray">Ksh 0</span>
          }
        />
        <Column
          caption="Reagents"
          cellRender={({ data }) => {
            const rows = data?.reagents ?? [];
            if (rows.length === 0) return <span className="text-gray">None</span>;
            return (
              <div className="flex flex-col gap-0.5">
                {rows.map((row) => (
                  <span key={row.id} className="text-xs">
                    {row.units_consumed_per_run} x {row.reagent_name}
                  </span>
                ))}
              </div>
            );
          }}
        />
        <Column
          dataField="unit_symbol"
          caption="Unit"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          caption="Report Setup"
          cellRender={({ data }) =>
            data.missing_setup?.length
              ? <span className="text-warning text-xs">Missing {data.missing_setup.join(" and ")}</span>
              : <span className="text-gray text-xs">Complete</span>
          }
        />
        <Column dataField="is_qualitative" caption="Qualitative" />
        <Column dataField="is_quantitative" caption="Quantitative" />
        <Column
          dataField="tat"
          caption="TAT (mins)"
          cellRender={({ data }) => {
            if (!data.tat) return "Default";
            // Simple parsing of "HH:MM:SS" or "DD HH:MM:SS"
            const parts = data.tat.split(':');
            if (parts.length >= 2) {
              const mins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
              return `${mins} mins`;
            }
            return data.tat;
          }}
        />
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      <EditTestPanelModal {...{ open, setOpen, selectedRowData }} />
      <ManagePanelReagents
        open={reagentsOpen}
        setOpen={setReagentsOpen}
        selectedRowData={selectedRowData}
      />
      <ForceDeleteDialog
        open={deleteOpen}
        setOpen={setDeleteOpen}
        resource="panel"
        id={selectedRowData?.id}
        name={selectedRowData?.name || "This panel"}
        onDeleted={() => dispatch(getAllLabTestPanels(auth))}
      />
    </section>
  );
};

export default TestPanels;

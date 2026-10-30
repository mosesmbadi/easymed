import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSelector, useDispatch } from 'react-redux';
import dynamic from "next/dynamic";
import { Grid } from '@mui/material';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { toast } from 'react-toastify';
import axios from 'axios';
import { APP_API_URL } from '@/assets/api-endpoints';

import { useAuth } from '@/assets/hooks/use-auth';
import { getAllIncomingItems, getItems } from '@/redux/features/inventory';
import { months } from "@/assets/dummy-data/laboratory";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { BiEdit } from 'react-icons/bi';
import { TbBox } from 'react-icons/tb';
import EditItemModal from './EditItemModal';
import ManageItemUnits from './ManageItemUnits';


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Edit Item",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
    {
      action: "pack-sizes",
      label: "Pack Sizes",
      icon: <TbBox className="text-primary text-xl mx-2" />,
    },
  ];

  return actions;
};

const ItemsGrid = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();
  const { item } = useSelector((store) => store.inventory);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [editOpen, setEditOpen] = useState(false)
  const [unitsOpen, setUnitsOpen] = useState(false)
  const [selectedRowData, setSelectedRowData] = useState({})

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const SearchedItems = item.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    if (auth.token) {
      dispatch(getItems(auth))
    }

  }, [auth])

  const onMenuClick = async (menu, data) => {
    if (menu.action === "update") {
      setSelectedRowData(data);
      setEditOpen(true);
    } else if (menu.action === "pack-sizes") {
      setSelectedRowData(data);
      setUnitsOpen(true);
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

  const renderPackSizes = ({ data }) => {
    const packs = data.unit_conversions ?? [];
    if (packs.length === 0) {
      return <span className="text-gray">Sold loose</span>;
    }
    const baseUnit = data.units_of_measure || 'units';
    return (
      <div className="flex flex-col gap-1">
        {packs.map((pack) => (
          <span key={pack.id}>
            {pack.name} of {pack.factor_to_base} {baseUnit}
            {pack.is_purchase_default && (
              <span className="text-xs text-primary"> · buys in</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const url = APP_API_URL.EXPORT_ITEMS;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${auth?.token}` },
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "items.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Failed to export items');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const url = APP_API_URL.IMPORT_ITEMS;
      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
          "Content-Type": "multipart/form-data",
        }
      });
      toast.success(response.data?.message || 'Items imported successfully');
      dispatch(getItems(auth));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to import items');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section className=" my-8">
      <h3 className="text-xl mt-8"> Items </h3>
      <Grid className="my-2 flex justify-between gap-4">
        <Grid className="w-full bg-white px-2 flex items-center rounded-lg" item md={4} xs={4}>
          <img className="h-4 w-4" src='/images/svgs/search.svg' />
          <input
            className="py-2 w-full px-4 bg-transparent rounded-lg focus:outline-none placeholder-font font-thin text-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
            fullWidth
            placeholder="Search item"
          />
        </Grid>
        <Grid className="w-full flex gap-2 justify-end" item md={8} xs={8}>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary rounded-md flex items-center justify-center text-white px-4 py-2 text-sm"
          >
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>

          <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="bg-primary rounded-md flex items-center justify-center text-white px-4 py-2 text-sm"
          >
            {importing ? 'Importing...' : 'Import from Excel'}
          </button>

          <Link className="bg-primary rounded-md flex items-center justify-center text-white px-4 py-2 text-sm" href="/dashboard/inventory/create-requisition">
            Create Requisition
          </Link>

          <Link className="bg-primary rounded-md flex items-center justify-center text-white px-4 py-2 text-sm" href="/dashboard/inventory/items/new">
            Add New Item
          </Link>
        </Grid>
      </Grid>
      <DataGrid
        dataSource={SearchedItems}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
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
        <Column
          dataField="item_code"
          caption="Code"
        />
        <Column dataField="name" caption="Name" />
        <Column
          dataField="category"
          caption="Category"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="units_of_measure" caption="Base Unit" />
        <Column
          dataField="unit_conversions"
          caption="Pack Sizes"
          allowSorting={false}
          cellRender={renderPackSizes}
        />
        <Column dataField="desc" caption="Description" />
        <Column
          dataField=""
          caption=""
          width={50}
          cellRender={actionsFunc}
        />
      </DataGrid>
      {editOpen && (
        <EditItemModal
          open={editOpen}
          setOpen={setEditOpen}
          selectedRowData={selectedRowData}
        />
      )}
      {unitsOpen && (
        <ManageItemUnits
          open={unitsOpen}
          setOpen={setUnitsOpen}
          selectedRowData={selectedRowData}
        />
      )}
    </section>

  )
}

export default ItemsGrid
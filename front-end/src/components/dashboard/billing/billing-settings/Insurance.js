import React, { useEffect, useState } from 'react'
import { Grid } from '@mui/material';
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { toast } from 'react-toastify';
import dynamic from "next/dynamic";

import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { useDispatch, useSelector } from 'react-redux';
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { BiEdit } from 'react-icons/bi';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { createAInsuranceToStore, getAllInsurance } from '@/redux/features/insurance';
import EditInsuranceModal from './modals/insurances/EditInsuranceModal';
import AccountStatementModal from './modals/insurances/AccountStatementModal';
import { createInsurance } from '@/redux/service/insurance';
import { ACCOUNT_TYPES, accountFields, accountValidationSchema } from './accounts';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const inputClass = "block border border-gray py-3 px-4 focus:outline-none w-full";

const getActions = () => [
  {
    action: "update",
    label: "Edit Account",
    icon: <BiEdit className="text-success text-xl mx-2" />,
  },
  {
    action: "statement",
    label: "Statement",
    icon: <HiOutlineDocumentText className="text-success text-xl mx-2" />,
  },
];

/**
 * Credit accounts: insurers, corporate clients that pay for their staff, and
 * facilities that send samples in. Each is billed through its own payment
 * mode at the prices agreed with it, and settles against a statement.
 */
const Insurance = () => {
  const auth = useAuth()
  const userActions = getActions();
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const { insurance } = useSelector((store) => store.insurance);
  const [selectedRowData, setSelectedRowData] = useState({})

  const initialValues = {
    name: "",
    account_type: "insurer",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  }

  useEffect(() => {
    dispatch(getAllInsurance(auth))
  }, [])

  const addNewAccount = async (values, helpers) => {
    setLoading(true)
    try {
      const response = await createInsurance(values, auth)
      dispatch(createAInsuranceToStore(response))
      helpers.resetForm();
      toast.success('Account created')
    } catch (error) {
      toast.error('Error creating the account')
      console.log("ERR", error)
    } finally {
      setLoading(false)
    }
  }

  const onMenuClick = (menu, data) => {
    setSelectedRowData(data);
    if (menu.action === "update") {
      setEditOpen(true);
    } else if (menu.action === "statement") {
      setStatementOpen(true);
    }
  };

  const actionsFunc = ({ data }) => (
    <CmtDropdownMenu
      sx={{ cursor: "pointer" }}
      items={userActions}
      onItemClick={(menu) => onMenuClick(menu, data)}
      TriggerComponent={
        <LuMoreHorizontal className="cursor-pointer text-xl" />
      }
    />
  );

  return (
    <div>
      <h2 className='mt-10 font-bold text-xl'>Credit Accounts</h2>
      <p className='text-sm mb-6'>
        Insurers, corporate clients that pay for their staff, and facilities that send
        samples in. Patients are billed to an account through its payment mode, at the
        prices agreed with it. Where nothing is agreed, a corporate client or a facility
        pays the price list; an insurer doesn&apos;t, and the patient pays.
      </p>
      <Formik
        initialValues={initialValues}
        validationSchema={accountValidationSchema}
        onSubmit={addNewAccount}
      >
        <Form>
          <Grid container spacing={2}>
            <Grid item md={5} xs={12}>
              <Field className={inputClass} type="text" placeholder="Account name" name="name" />
              <ErrorMessage name="name" component="div" className="text-warning text-xs" />
            </Grid>
            <Grid item md={4} xs={12}>
              <Field as="select" className={inputClass} name="account_type">
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Field>
            </Grid>
            <Grid item md={3} xs={12} />
            {accountFields.map((field) => (
              <Grid item md={3} xs={12} key={field.name}>
                <Field className={inputClass} type={field.type || "text"} placeholder={field.placeholder} name={field.name} />
                <ErrorMessage name={field.name} component="div" className="text-warning text-xs" />
              </Grid>
            ))}
            <Grid item md={3} xs={12}>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary rounded-xl text-sm px-4 py-2 text-white disabled:opacity-60"
              >
                {loading ? "Saving..." : "Add Account"}
              </button>
            </Grid>
          </Grid>
        </Form>
      </Formik>
      <div className='my-10'>
        <DataGrid
          dataSource={insurance}
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
            showPageSizeSelector={true}
            showInfo={true}
            showNavigationButtons={true}
          />
          <Column dataField="name" caption="Name" />
          <Column dataField="account_type_display" caption="Type" width={160} />
          <Column dataField="contact_person" caption="Contact" />
          <Column dataField="email" caption="Email" />
          <Column dataField="phone" caption="Phone" width={130} />
          <Column
            dataField=""
            caption=""
            width={50}
            cellRender={actionsFunc}
          />
        </DataGrid>
        <EditInsuranceModal open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData} />
        <AccountStatementModal open={statementOpen} setOpen={setStatementOpen} account={selectedRowData} />
      </div>
    </div>
  )
}

export default Insurance;

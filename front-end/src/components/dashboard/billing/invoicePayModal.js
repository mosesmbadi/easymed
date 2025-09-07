import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import * as Yup from "yup"
import DialogContent from "@mui/material/DialogContent";
import dynamic from "next/dynamic";
import { Column, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid";
import { Grid } from "@mui/material";
import Select from 'react-select';
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { ErrorMessage, Field, Form, Formik } from "formik";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";
import { payInvoices } from "@/redux/service/billing";
import { getPatientInvoices, getPaymentModes } from "@/redux/features/billing";
import { getAllPatients } from "@/redux/features/patients";
import ViewInvoiceItems from "./ViewInvoiceItemsModal";
import { getAllInsurance } from "@/redux/features/insurance";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
      {
          action: "invoice_items",
          label: "Invoice Items",
          icon: <CiMoneyCheck1 className="text-success text-xl mx-2" />,
      },
  ];

  return actions;
};

const InvoicePayModal = () => {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState("cash")
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedInsurance, setSelectedInsurance] = useState(null)
  const dispatch = useDispatch();
  const { patients } = useSelector((store) => store.patient);
  const { insurance } = useSelector((store) => store.insurance);
  const { invoices, paymodes } = useSelector((store) => store.billing);
  const [selectedRowData, setSelectedRowData] = useState({})
  const [open,setOpen] = useState(false)
  const auth = useAuth();
  const userActions = getActions();

  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);

  const [allMode, setAllMode] = useState('allPages');
  const [selectedItems, setSelectedItems] = useState(null)
  // const [checkBoxesMode, setCheckBoxesMode] = useState(
  //     themes.current().startsWith('material') ? 'always' : 'onClick',
  // );

  const handleSelectionChanged = (selectedRowKeys) => {
      setSelectedItems(selectedRowKeys);
  };

  const initialValues = {
    invoice: 1,
    payment_mode: '',
    payment_amount: '',
  }

  const validationSchema = Yup.object().shape({
    payment_amount: Yup.number().required("Amount is required !")
  });

  const calculateInvoiceCash = (data) => {
    let cashAmount = 0;
    data.invoice_items.forEach((invoiceItem)=> {
      if(invoiceItem?.payment_mode_name?.toLowerCase()=== 'cash'){
        cashAmount += parseFloat(invoiceItem.actual_total)
      }else{
        let co_pay = parseFloat(invoiceItem.item_amount) - parseFloat(invoiceItem.actual_total);
        cashAmount += co_pay
      }
    })
    return cashAmount;
  };

  const calculateInvoiceCashAndInsurance = (data) => {
    let totalAmount = 0;
    data.invoice_items.forEach((invoiceItem)=> {
      totalAmount += parseFloat(invoiceItem.item_amount)
    })
    return totalAmount;
  }

  const payIndividualInvoices = (payload) => {
    let paymentAmt = payload.payment_amount

    selectedItems?.selectedRowsData.forEach( async (invoice)=> {
      // Get total cash required for invoice
      let requiredCash = calculateInvoiceCash(invoice)
      // Get total cash and insurance required for invoice
      let totalRequired = calculateInvoiceCashAndInsurance(invoice)
      // Get balance from cash paid
      let balanceFromPaidCash = requiredCash - parseFloat(invoice.cash_paid)
      // If payment amount is greater than or equal to balance from paid cash, pay the balance from paid cash
      // Else pay the payment amount
      if(paymentAmt >= balanceFromPaidCash){
        payload = {
          ...payload,
          invoice: invoice.id,
          payment_amount: balanceFromPaidCash
        }
        paymentAmt-=balanceFromPaidCash;
      }else {
        payload = {
          ...payload,
          invoice: invoice.id,
          payment_amount: paymentAmt
        }
      }

      try{
        await payInvoices(auth, payload);
        toast.success("payment successfull");
      }catch(error){
        toast.error(err);
        setLoading(false);
      }
    })
  }
  
  const handlePay = async (formValue) => {

    if(!selectedPatient){
      toast.error("Select A patient");
      return;
    }

    if (!selectedItems?.selectedRowsData?.length) {
      toast.error("Select at least one invoice");
      return;
    }

    let paymentAmt = formValue.payment_amount;
    let hasInsufficientFunds = false;

    selectedItems?.selectedRowsData.map((invoice) => {

      if(paymentAmt <= 0){
        hasInsufficientFunds=true
        return;
      }

      let amountPaid = parseFloat(invoice.cash_paid)

      invoice.invoice_items.forEach((invoiceItem)=> {
        if(invoiceItem.payment_mode_name?.toLowerCase() === 'cash'){
          let remainder = parseFloat(invoiceItem.actual_total) - amountPaid
          if(remainder > 0){
            paymentAmt -= parseFloat(remainder)
            amountPaid = 0;
          }else{
            amountPaid -= parseFloat(invoiceItem.actual_total);
          }
        }else{
          let co_pay = parseFloat(invoiceItem.item_amount) - parseFloat(invoiceItem.actual_total);
          let remainder = parseFloat(co_pay) - amountPaid
          if(remainder > 0){
            paymentAmt -= parseFloat(co_pay)
            amountPaid = 0;
          }else{
            amountPaid -= parseFloat(co_pay);
          }
        }
      })
    })

    if(hasInsufficientFunds){
      toast.error(`Amount cannot settle all these invoices.`);
      return;
    }

    let payload = {
      ...formValue,
    }

    if(payMethod === 'cash'){
      const paymode = paymodes.find((mode)=> mode?.payment_category?.toLowerCase() === 'cash')
      payload = {
        ...formValue,
        payment_mode: paymode.id
      }
    }else{
      payload = {
        ...formValue,
      }
    }

    try {

      await payIndividualInvoices(payload)

      dispatch(getPatientInvoices(auth, selectedPatient?.value));

    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  useEffect(()=> {
    if(auth){
        dispatch(getAllPatients(auth));
        dispatch(getPaymentModes(auth));
        dispatch(getAllInsurance(auth))
    }
  }, [auth]);

  const handleChange = (selectedPatient) => {
    if (selectedPatient){
      setSelectedPatient(selectedPatient);
      dispatch(getPatientInvoices(auth, selectedPatient?.value))
    }else{
      setSelectedPatient(selectedPatient);
    }

  };

  const handleChangeInsurance = (selectedInsurance) => {
    if (selectedInsurance){
      setSelectedInsurance(selectedInsurance);
      // dispatch(getPatientInvoices(auth, selectedPatient?.value))
    }else{
      setSelectedInsurance(selectedInsurance);
    }

  };

  const onMenuClick = async (menu, data) => {
    if (menu.action === "invoice_items") {
      setSelectedRowData(data);
      setOpen(true);
    }
  };
  
  const actionsFunc = ({ data }) => {
    return (
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl flex items-center" />
          }
        />
    );
  };

  const calculateInvoiceCashAmount = ({ data }) => {
    let cashAmount = 0;
    data.invoice_items.forEach((invoiceItem)=> {
      if(invoiceItem?.payment_mode_name?.toLowerCase()=== 'cash'){
        cashAmount += parseFloat(invoiceItem.actual_total)
      }else{
        let co_pay = parseFloat(invoiceItem.item_amount) - parseFloat(invoiceItem.actual_total);
        cashAmount += co_pay
      }
    })
    return cashAmount;
  };
  
  return (
    <section>
      <Grid container className="my-2" spacing={2}>
          <Grid onClick={()=> { 
            setPayMethod("cash")
            setSelectedPatient(null)
            setSelectedInsurance(null)
          }
        } 
        item md={6} xs={12}>
          <div className={`p-2 ${payMethod === "cash" ? "bg-card text-white" : "bg-background"} border border-gray rounded-lg text-center cursor-pointer`}>Cash</div>
        </Grid>
        
        <Grid onClick={()=>{
            setPayMethod("insurance")
            setSelectedPatient(null)
            setSelectedInsurance(null)
          }
        }
           item md={6} xs={12}>
          <div className={`p-2 ${payMethod === "insurance" ? "bg-orange text-white" : "bg-background"} border border-gray rounded-lg text-center cursor-pointer`}>Insurance</div>
        </Grid>
      </Grid>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handlePay}
      >
        <Form className="py-4">
          <Grid container className="flex items-end justify-center" spacing={2}>
            <Grid item md={6} xs={12}>
              <h2 className='text-xl rounded-lg text-primary'>{ payMethod === "cash" ? "Select A Patient" : "Select Insurance"}</h2>
              {payMethod === "cash" ? 
                (<Select
                  value={selectedPatient}
                  isSearchable
                  isClearable
                  onChange={handleChange}
                  options={patients.map((patient) => ({ value: patient.id, label: `${patient?.first_name} ${patient?.second_name}` }))}
                />): (
                <Select
                  value={selectedInsurance}
                  isSearchable
                  isClearable
                  onChange={handleChangeInsurance}
                  options={insurance.map((insurance) => ({ value: insurance.id, label: `${insurance?.name}` }))}
                />)}
            </Grid>
            
            <Grid item md={3} xs={12}>
              <label className='text-xl rounded-lg text-primary' htmlFor="invoice_no">Payment Amount</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Payment Amount"
                name="payment_amount"
              />
              <ErrorMessage
                name="payment_amount"
                component="div"
                className="text-warning text-xs"
              />                  
            </Grid>
            <Grid item md={3} xs={12}>
              <button
                type="submit"
                className="bg-primary rounded-xl text-sm px-4 py-2 text-white"
              >
                {loading && (
                  <svg
                    aria-hidden="true"
                    role="status"
                    class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="#1C64F2"
                    ></path>
                  </svg>
                )}
                {`Settle Payments`}
              </button>
            </Grid>
          </Grid>
        </Form>
      </Formik>
      <DataGrid
        dataSource={selectedPatient ? invoices : []}
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
        onSelectionChanged={handleSelectionChanged}
      >
        <Selection
          mode="multiple"
          selectAllMode={allMode}
          // showCheckBoxesMode={checkBoxesMode}
        />

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
          dataField="invoice_number"
          caption="Invoice Number" 
        />
        <Column
          dataField="invoice_date"
          caption="Date" 
        />
        <Column
            dataField="patient_name"
            caption="Patient" 
        />
        <Column dataField="invoice_amount" caption="Invoice Amount" />
        <Column 
          dataField="invoice_amount" 
          caption="Invoice Cash Amount"
          cellRender={calculateInvoiceCashAmount}
        />
        <Column dataField="cash_paid" caption="Amount Paid" />
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
      {open && <ViewInvoiceItems {...{setOpen,open,selectedRowData}} />}
    </section>
  )
}

export default InvoicePayModal
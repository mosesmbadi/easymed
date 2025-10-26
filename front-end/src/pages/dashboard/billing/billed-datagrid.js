import React, { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import { useDispatch, useSelector } from 'react-redux';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import { Button, Grid } from "@mui/material";
import { MdLocalPrintshop } from 'react-icons/md'
import { MdPayment } from 'react-icons/md'

import { getAllInvoices } from '@/redux/features/billing';
import { downloadPDF } from '@/redux/service/pdfs';
import { updateInvoices } from '@/redux/service/billing';
import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";

import { dayTransaction } from '@/redux/service/reports';
import DayTotalsPerPayMode from '@/components/dashboard/billing/DayTotalsPerPayMode';
import { getAllPatients } from '@/redux/features/patients';
import ViewInvoiceItems from '@/components/dashboard/billing/ViewInvoiceItemsModal';
import SearchOnlyFilter from '@/components/common/process/SearchOnly';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = (isPaid = false) => {
    let actions = [
        {
            action: "print",
            label: "Print",
            icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
        },
        {
            action: "invoice_items",
            label: "Invoice Items",
            icon: <CiMoneyCheck1 className="text-success text-xl mx-2" />,
        },
    ];

    // Only add "Mark as Paid" for pending invoices
    if (!isPaid) {
        actions.push({
            action: "mark_paid",
            label: "Mark as Paid",
            icon: <MdPayment className="text-success text-xl mx-2" />,
        });
    }

    return actions;
};

const BilledDataGrid = () => {
    const dispatch = useDispatch();
    const auth = useAuth()
    const { allInvoices } = useSelector((store) => store.billing);
    const { patients } = useSelector((store) => store.patient);
    const [open,setOpen] = useState(false)
    const [totalsViewOPen, setTotalsViewOPen] = useState(false)
    const [selectedRowData, setSelectedRowData] = useState({})
    const [infoAsPerPayMode, setInfoAsPerPayMode] = useState({})
    const [selectedPayMethod, setSelectedPayMethod] = useState('')
    const [processFilter, setProcessFilter] = useState({ search: "" });
    const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);

    const items = [
        {label: "None", value: ""},
        {label: "Patient First Name", value: "patient__first_name"},
        {label: "Patient Second Name", value: "patient__second_name"},
        {label: "Invoice Number", value: "patient_number"},
        // {label: "Track Number", value: "track_number"},
        // {label: "Doctor First Name", value: "doctor__first_name"},
        // {label: "Doctor Last Name", value: "doctor__last_name"},
        // {label: "Lab Tech First Name", value: "lab_tech__first_name"},
        // {label: "Lab Tech Last Name", value: "lab_tech__last_name"},
        // {label: "Pharmacist First Name", value: "pharmacist__first_name"},
        // {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
        // {label: "Reason", value: "reason"},
        // {label: "Diagnosis", value: "clinical_note__diagnosis"},
        // {label: "Doctors Notes", value: "clinical_note__doctors_note"},
        // {label: "Signs And Symptoms", value: "clinical_note__signs_and_symptoms"},
        // {label: "Test Profile Name", value: "process_test_req__attendace_test_requests__test_profile__name"},
        // {label: "Prescribed Drug Name", value: "prescription__attendance_prescribed_drugs__item__name"},
    ]

    const handlePrint = async (data) => {
        try{
            const response = await downloadPDF(data.id, "_invoice_pdf", auth)
            window.open(response.url, '_blank');
            toast.success("got pdf successfully")

        }catch(error){
            console.log(error)
            toast.error(error)
        }
        
    };

    const handleMarkAsPaid = async (data) => {
        try {
            if (data.status === 'paid') {
                toast.info("Invoice is already marked as paid");
                return;
            }

            const payload = {
                status: 'paid'
            };

            await updateInvoices(auth, data.id, payload);
            toast.success("Invoice marked as paid successfully");
            
            // Refresh the invoices list
            dispatch(getAllInvoices(auth, processFilter, selectedSearchFilter));
        } catch (error) {
            console.log(error);
            toast.error("Failed to mark invoice as paid");
        }
    };

    const onMenuClick = async (menu, data) => {
        if (menu.action === "invoice_items") {
          setSelectedRowData(data);
          setOpen(true);
        } else if (menu.action === "print"){
          handlePrint(data);
        } else if (menu.action === "mark_paid") {
          handleMarkAsPaid(data);
        }
      };
    
      const actionsFunc = ({ data }) => {
        const isPaid = data.status === 'paid';
        const userActions = getActions(isPaid);
        
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

      const statusFunc = ({ data }) => {
        const isPaid = data.status === 'paid';
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isPaid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
            }`}>
                {isPaid ? 'Paid' : 'Pending'}
            </span>
        );
      };

      const getTransactionPerDayForAPaymentMethod = async (payment_method) => {
        console.log("Payment method is", payment_method)
        
        try {
            setSelectedPayMethod(payment_method)
            setTotalsViewOPen(true)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');

            const formattedDate = `${year}-${month}-${day}`;
            const payload = {
                date: formattedDate,
                payment_method: payment_method
            }
            await dayTransaction(payload, auth).then((res)=> {
                console.log("PAY FOR THE DAY", res)
                setInfoAsPerPayMode(res)
            })
        }catch(e){
            console.log("Error", e)
        }

      }
    

    // Initial load of all invoices and patients
    useEffect(()=> {
        if(auth){
            dispatch(getAllInvoices(auth, processFilter, selectedSearchFilter));
            dispatch(getAllPatients(auth));
        }
    }, [auth]);

    useEffect(() => {
        // This effect handles the debouncing logic for search
        const timerId = setTimeout(() => {
            // Dispatch the action only after a 500ms delay
            if (auth) {
                dispatch(getAllInvoices(auth, processFilter, selectedSearchFilter))
            }
        }, 500); // 500ms delay, adjust as needed

        // Cleanup function: clears the timer if searchTerm changes before the delay is over
        return () => {
            clearTimeout(timerId);
        };
    }, [processFilter.search, selectedSearchFilter]); // The effect re-runs when search term or filter changes

    return (
        <section clasName="">
            <SearchOnlyFilter
                selectedFilter={processFilter} 
                setProcessFilter={setProcessFilter}
                selectedSearchFilter={selectedSearchFilter} 
                setSelectedSearchFilter={setSelectedSearchFilter}
                items={items}
            />


            <DataGrid
                dataSource={allInvoices}
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
                <Column dataField="invoice_amount" caption="Amount" />
                <Column 
                    dataField="status"
                    caption="Status"
                    cellRender={statusFunc}
                />
                <Column 
                    dataField="" 
                    caption=""
                    cellRender={actionsFunc}
                />
            </DataGrid>
            <div className='w-full mt-4 flex justify-between h-12 gap-4'>
                <div onClick={()=> getTransactionPerDayForAPaymentMethod("cash")} className='w-full gap-2 flex justify-center items-center bg-white rounded-lg cursor-pointer'>
                    <button>
                        Daily Cash Total.
                    </button>
                </div>
                <div onClick={()=> getTransactionPerDayForAPaymentMethod("mpesa")} className='w-full gap-2 flex justify-center items-center bg-white rounded-lg cursor-pointer'>
                    <button>
                        Daily Mpesa Total.
                    </button>
                </div>
                <div onClick={()=>getTransactionPerDayForAPaymentMethod("insurance")} className='w-full gap-2 flex justify-center items-center bg-white rounded-lg cursor-pointer'>
                    <button>
                        Daily Insurance Total.
                    </button>
                </div>
            </div>
            {open && <ViewInvoiceItems {...{setOpen,open,selectedRowData}} />}
            {totalsViewOPen &&  <DayTotalsPerPayMode {...{setTotalsViewOPen, totalsViewOPen, infoAsPerPayMode, selectedPayMethod}} />}
        </section>
    )
}

export default BilledDataGrid;
import React, { useEffect, useState } from 'react';
import { toast } from "react-toastify";
import { useDispatch, useSelector } from 'react-redux';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import { Button, Grid } from "@mui/material";
import { MdLocalPrintshop } from 'react-icons/md'

import { getAllInvoices } from '@/redux/features/billing';
import { downloadPDF } from '@/redux/service/pdfs';
import { useAuth } from '@/assets/hooks/use-auth';
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { CiMoneyCheck1 } from "react-icons/ci";

import { dayTransaction } from '@/redux/service/reports';
import DayTotalsPerPayMode from '@/components/dashboard/billing/DayTotalsPerPayMode';
import { getAllPatients } from '@/redux/features/patients';
import ViewInvoiceItems from '@/components/dashboard/billing/ViewInvoiceItemsModal';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
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

    return actions;
};

const BilledDataGrid = () => {
    const userActions = getActions();
    const dispatch = useDispatch();
    const auth = useAuth()
    const { invoices } = useSelector((store) => store.billing);
    const { patients } = useSelector((store) => store.patient);
    const [open,setOpen] = useState(false)
    const [totalsViewOPen, setTotalsViewOPen] = useState(false)
    const [selectedRowData, setSelectedRowData] = useState({})
    const [infoAsPerPayMode, setInfoAsPerPayMode] = useState({})
    const [selectedPayMethod, setSelectedPayMethod] = useState('')

    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);

    const handlePrint = async (data) => {
        try{
            const response = await downloadPDF(data.id, "_invoice_pdf", auth)
            window.open(response.link, '_blank');
            toast.success("got pdf successfully")

        }catch(error){
            console.log(error)
            toast.error(error)
        }
        
    };

    const onMenuClick = async (menu, data) => {
        if (menu.action === "invoice_items") {
          setSelectedRowData(data);
          setOpen(true);
        }else if (menu.action === "print"){
          handlePrint(data);
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
    

    useEffect(()=> {
        if(auth){
            dispatch(getAllInvoices(auth));
            dispatch(getAllPatients(auth));
        }
    }, [auth]);

    return (
        <section clasName="">
            <DataGrid
                dataSource={invoices}
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
import { useAuth } from '@/assets/hooks/use-auth';
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { getAllInvoiceItemsByInvoiceId } from '@/redux/features/billing';


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const AdmittedInvoices = ({invoice, patient}) => {
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const { invoiceItems } = useSelector((store) => store.billing);
  const dispatch = useDispatch();
  const auth = useAuth();

  const renderPaymentMode = (cellData) => {
    return (
      <span>{cellData.data?.payment_mode_name ? cellData.data?.payment_mode_name : 'Not Billed'}</span>
    );
  }

  useEffect(() => {
    if(auth.token){
      dispatch(getAllInvoiceItemsByInvoiceId(auth, invoice))
    }

  }, []);
  return (
    <div className='w-full p-4 bg-white shadow-md rounded-lg'>
      <div className='w-full flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold mb-4'>{patient}</h2>
      </div>

      <DataGrid
        dataSource={invoiceItems}
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
          dataField="item_name" 
          caption="Item Name" 
        />
        <Column 
          dataField="item_amount" 
          caption="Amount" 
        />
        <Column
          dataField="payment_mode_name"
          caption="Payment Mode"
          cellRender={renderPaymentMode}
        />
        <Column
          dataField="status"
          caption="Status"
        />
      </DataGrid>
    </div>
  )
}

export default AdmittedInvoices
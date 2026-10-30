import React, { useState } from "react";
import CustomizedLayout from "../../../components/layout/customized-layout";
import { MdLocalPrintshop } from "react-icons/md";


const PrintInvoice = () => {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <section className="flex flex-col items-center justify-center">
        <section className="bg-white rounded p-2 my-4 w-full">
          <section className="flex items-center justify-between text-sm border-b border-gray">
            <div>
              <p>Name</p>
              <p>Reg No.</p>
            </div>
            <div>
              <p>Account : ABSA Bank</p>
              <p>Category</p>
              <p>Member No:</p>
            </div>
          </section>
          <section className="flex items-center justify-between border-b border-gray text-sm font-semibold py-2">
            <div>
              <h1>Bill Date</h1>
            </div>
            <div>
              <h1>Items</h1>
            </div>
            <div>
              <h1>Price</h1>
            </div>
            <div>
              <h1>Qty</h1>
            </div>
            <div>
              <h1>Total</h1>
            </div>
          </section>
          <section className="flex items-center justify-between text-xs py-2">
            <div className="space-y-3">
              <p>14/7/2023</p>
              <p>14/7/2023</p>
              <p>14/7/2023</p>
              <p>14/7/2023</p>
            </div>
            <div className="space-y-3">
              <p>Paracetamol</p>
              <p>Paracetamol</p>
              <p>Paracetamol</p>
              <p>Paracetamol</p>
            </div>
            <div className="space-y-3">
              <p>20</p>
              <p>20</p>
              <p>20</p>
              <p>20</p>
            </div>
            <div className="space-y-3">
              <p>10</p>
              <p>10</p>
              <p>10</p>
              <p>10</p>
            </div>
            <div className="space-y-3">
              <p>40</p>
              <p>40</p>
              <p>40</p>
              <p>40</p>
            </div>
          </section>
          <section className="text-xs mt-8 w-3/12 mx-auto">
            <div className="flex items-center gap-4 border-b border-gray">
              <p>Total</p>
              <p>7,840</p>
            </div>
            <div className="flex items-center gap-4 border-b border-gray">
              <p>Amount Payable</p>
              <p>7,840</p>
            </div>
          </section>
        </section>
        <section className="flex items-center justify-end gap-2">
          <button className="bg-primary text-white px-3 py-2 text-xs rounded-xl">
            Save Invoice
          </button>
          <button className="border border-primary flex items-center gap-2 px-3 py-2 text-xs rounded-xl">
            <MdLocalPrintshop />
            Print Invoice
          </button>
        </section>
      </section>
    </>
  );
};


export default PrintInvoice;

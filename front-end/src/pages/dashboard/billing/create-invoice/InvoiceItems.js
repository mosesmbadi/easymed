import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getPaymentModes } from "@/redux/features/billing";
import CategorizedItems from "./CategorizedItems";

const { Grid } = require("@mui/material");

const InvoiceItems = ({ items, selectedPatient, onLineChange }) => {
    const authUser = useAuth()
    const dispatch = useDispatch()
    const { paymodes, } = useSelector(({ billing }) => billing);
    const itemRefs = useRef({});
    const [billAllLoading, setBillAllLoading] = useState(false);

    // Show exactly: one "Cash" entry (default/first cash mode) + the patient's own insurance modes.
    const defaultCashMode = paymodes.find((mode) => mode.is_default) ||
        paymodes.find((mode) => mode.payment_category === 'cash');

    const patient_insurance = [
        ...(defaultCashMode ? [{ ...defaultCashMode, payment_mode: 'Cash' }] : []),
        ...paymodes.filter((mode) =>
            mode.payment_category === 'insurance' &&
            selectedPatient?.insurances?.some((ins) => ins.id === mode.insurance)
        ),
    ];

    useEffect(() => {
        if (authUser) {
            dispatch(getPaymentModes(authUser));
        }
    }, [authUser]);

    // One at a time: a profile can put a dozen lines on one invoice, and each
    // one re-totals it.
    const handleBillAll = async () => {
        setBillAllLoading(true);
        try {
            for (const ref of Object.values(itemRefs.current)) {
                if (ref?.billItem) {
                    await ref.billItem();
                }
            }
        } finally {
            setBillAllLoading(false);
        }
    };

    const groupedItems = items?.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    type="button"
                    onClick={handleBillAll}
                    disabled={billAllLoading}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {billAllLoading ? "Processing..." : "Bill All Items"}
                </button>
            </div>
            <Grid className='flex items-center py-1 border-b border-[#D3D3D3]' container>
                <Grid item xs={3}>
                    <h2 className='font-bold text-primary'>Particulars</h2>
                </Grid>
                <Grid item xs={3}>
                    <h2 className='font-bold text-primary'>Pay mode</h2>
                </Grid>
                <Grid className='px-2 flex justify-end' item xs={2}>
                    <h2 className='font-bold text-primary'>Line Total</h2>
                </Grid>
                <Grid className='px-2 flex justify-end' item xs={2}>
                    <h2 className='font-bold text-primary'>Discount</h2>
                </Grid>
                <Grid className='px-2 flex justify-end' item xs={1}>
                    <h2 className='font-bold text-primary'>PT PAY</h2>
                </Grid>
                <Grid item xs={1}></Grid>
            </Grid>
            {groupedItems && (
                Object.keys(groupedItems).map(category => (
                    <section key={category} className='py-2'>
                        <p className='text-xs uppercase text-gray-500'>{category}</p>
                        {groupedItems[category].map(item => (
                            <CategorizedItems
                                key={item.id}
                                invoiceItem={item}
                                patient_insurance={patient_insurance}
                                onLineChange={onLineChange}
                                ref={(el) => (itemRefs.current[item.id] = el)}
                            />
                        ))}
                    </section>
                ))
            )}
        </div>
    );
};

export default InvoiceItems;

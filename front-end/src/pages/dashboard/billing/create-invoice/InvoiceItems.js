import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getPaymentModes } from "@/redux/features/billing";
import CategorizedItems from "./CategorizedItems";

const { Container, Grid } = require("@mui/material");

const InvoiceItems = ({
    items, selectedPatient, selectedInvoice,
    totalLabReqSum,
    totalAppointmentSum,
    totalPrescribedDrugsSum,
    setLabReqSum,
    setLabReqCashSum,
    setLabReqInsuranceSum,
    setAppointmentSum,
    setAppointmentCashSum,
    setAppointmentInsuranceSum,
    setPrescribedDrugsSum,
    setPrescribedDrugsCashSum,
    setPrescribedDrugsInsuranceSum,
}) => {
    const authUser = useAuth()
    const dispatch = useDispatch()
    const { paymodes, } = useSelector(({ billing }) => billing);
    const itemRefs = useRef({});
    const [billAllLoading, setBillAllLoading] = useState(false);

    const patient_insurance = paymodes.filter((mode) =>
        mode.insurance === null || selectedPatient.insurances.some(insurance => insurance.id === mode.insurance)
    );

    useEffect(() => {
        if (authUser) {
            dispatch(getPaymentModes(authUser));
        }
    }, [authUser]);

    const handleBillAll = async () => {
        setBillAllLoading(true);
        try {
            const promises = Object.values(itemRefs.current).map(ref => {
                if (ref && ref.billItem) {
                    return ref.billItem();
                }
                return Promise.resolve({ success: false, message: 'Ref missing' });
            });

            await Promise.all(promises);
            // We could show a summary toast here if needed
        } catch (error) {
            console.error("Error billing all items:", error);
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

    const resetTotals = () => {
        setPrescribedDrugsSum(0)
        setPrescribedDrugsCashSum(0)
        setPrescribedDrugsInsuranceSum(0)
        setLabReqSum(0)
        setLabReqCashSum(0)
        setLabReqInsuranceSum(0)
        setAppointmentSum(0)
        setAppointmentCashSum(0)
        setAppointmentInsuranceSum(0)
    }

    useEffect(() => {
        resetTotals();
        if (groupedItems) {
            Object.keys(groupedItems).forEach((category) => {
                const billedItems = groupedItems[category].filter(item => item.status === 'billed');
                if (category.toLowerCase().includes("appointment")) {
                    totalAppointmentSum(billedItems);
                } else if (category === "Lab Test") {
                    totalLabReqSum(billedItems);
                } else if (category === "Drug") {
                    totalPrescribedDrugsSum(billedItems);
                }
            });
        }
    }, [items, selectedInvoice]);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleBillAll}
                    disabled={billAllLoading}
                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {billAllLoading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        "Bill All Items"
                    )}
                </button>
            </div>
            {groupedItems && (
                Object.keys(groupedItems)?.map(category => (
                    <section key={category} className='py-2'>
                        <Grid className='flex items-center py-1' container spacing={2}>
                            <Grid item md={3} xs={3}>
                                <h2 className='font-bold text-primary'>{category}</h2>
                            </Grid>
                            <Grid item xs={4}>
                                <h2 className='font-bold text-primary'>{'Payment Mode'}</h2>
                            </Grid>
                            <Grid className='px-2 flex justify-end' item xs={2}>
                                <h2 className='font-bold text-primary'>{'Actual Total'}</h2>
                            </Grid>
                            <Grid className='px-2 flex justify-end' item xs={2}>
                                <h2 className='font-bold text-primary'>{'Item Amount'}</h2>
                            </Grid>
                            <Grid item xs={1}>
                            </Grid>
                        </Grid>
                        <section>
                            {groupedItems[category].map(item => (
                                <CategorizedItems
                                    key={item.id}
                                    invoiceItem={item}
                                    patient_insurance={patient_insurance}
                                    setLabReqSum={setLabReqSum}
                                    setLabReqCashSum={setLabReqCashSum}
                                    setLabReqInsuranceSum={setLabReqInsuranceSum}
                                    setAppointmentSum={setAppointmentSum}
                                    setAppointmentCashSum={setAppointmentCashSum}
                                    setAppointmentInsuranceSum={setAppointmentInsuranceSum}
                                    setPrescribedDrugsSum={setPrescribedDrugsSum}
                                    setPrescribedDrugsCashSum={setPrescribedDrugsCashSum}
                                    setPrescribedDrugsInsuranceSum={setPrescribedDrugsInsuranceSum}
                                    ref={(el) => (itemRefs.current[item.id] = el)}
                                />
                            ))}
                        </section>
                    </section>
                ))
            )}
        </div>
    );
};

export default InvoiceItems;
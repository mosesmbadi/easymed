import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { toast } from "react-toastify";
import { applyInvoiceDiscount } from '@/redux/service/billing'
import { useAuth } from '@/assets/hooks/use-auth'
import { isAdmin } from '@/utils/permissions';
import PayAmountsDisplay from '@/components/dashboard/billing/payOverview/PayAmountsDisplay';
import InvoiceItems from './InvoiceItems';

const amount = (value) => parseFloat(value) || 0;

const ReviewInvoice = ({ selectedOption, selectedInvoice, selectedPatient }) => {
    const auth = useAuth()
    const { invoiceItems } = useSelector((store) => store.billing)
    const [lines, setLines] = useState([]);
    const [applyingDiscount, setApplyingDiscount] = useState(false);

    // The store can still hold the last invoice's lines until this one's arrive.
    useEffect(() => {
        setLines((invoiceItems || []).filter((line) => line.invoice === selectedInvoice?.id));
    }, [invoiceItems, selectedInvoice?.id]);

    const onLineChange = (updated) => {
        setLines((current) => current.map((line) => (line.id === updated.id ? updated : line)));
    };

    const handleApplyDiscount = async (value) => {
        setApplyingDiscount(true);
        try {
            const invoice = await applyInvoiceDiscount(auth, selectedInvoice.id, value);
            setLines(invoice.invoice_items);
            toast.success("Discount applied");
        } catch (error) {
            toast.error(typeof error === 'string' ? error : "Could not apply the discount");
        } finally {
            setApplyingDiscount(false);
        }
    };

    // All from what the server recorded on the lines billed so far.
    const billed = lines.filter((line) => line.status === 'billed');
    const total = billed.reduce((sum, line) => sum + amount(line.net_amount), 0);
    const credit = billed.reduce((sum, line) => sum + amount(line.insurer_amount), 0);
    const discount = billed.reduce(
        (sum, line) => sum + amount(line.discount) + amount(line.invoice_discount), 0);
    const invoiceDiscount = billed.reduce((sum, line) => sum + amount(line.invoice_discount), 0);
    const cash = total - credit + discount;

    if (!selectedOption) return null;

    return (
        <div className="py-4 bg-white_light rounded-lg space-y-4 px-2 min-h-full flex flex-col justify-between">
            <div className='space-y-8'>
                {selectedInvoice && (
                    <InvoiceItems
                        selectedPatient={selectedPatient}
                        items={lines}
                        onLineChange={onLineChange}
                    />
                )}
            </div>

            <section className='mt-auto mr-4 space-y-4 bottom-0'>
                <PayAmountsDisplay
                    cash={cash}
                    discount={discount}
                    credit={credit}
                    total={total}
                    invoiceDiscount={invoiceDiscount}
                    canDiscount={isAdmin(auth) && billed.length > 0}
                    applying={applyingDiscount}
                    onApplyDiscount={handleApplyDiscount}
                />
            </section>
        </div>
    )
}

export default ReviewInvoice

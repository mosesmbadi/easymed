import React, { useEffect, useState } from 'react'

const money = (value) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Row = ({ label, children }) => (
    <div className='flex justify-end'>
        <div className='border-b border-[#D3D3D3] w-64 justify-between items-center flex py-1'>
            <h2>{label}</h2>
            <div className='text-right'>{children}</div>
        </div>
    </div>
);

// Cash - Discount + Credit = Total. A discount on the total comes off cash only,
// so credit accounts are always billed their agreed price in full.
const PayAmountsDisplay = ({
    cash, discount, credit, total, invoiceDiscount, canDiscount, applying, onApplyDiscount,
}) => {
    const [value, setValue] = useState('');

    useEffect(() => {
        setValue(invoiceDiscount ? String(invoiceDiscount) : '');
    }, [invoiceDiscount]);

    return (
        <div className='flex flex-col justify-end space-y-2 w-full'>
            <Row label="Cash">{money(cash)}</Row>
            <Row label="Discount">
                {money(discount)}
            </Row>
            {canDiscount && (
                <div className='flex justify-end'>
                    <div className='w-64 flex items-center justify-between gap-2'>
                        <label htmlFor="invoice-discount" className='text-xs text-gray-500'>Discount on total</label>
                        <input
                            id="invoice-discount"
                            className="border border-gray rounded px-2 py-1 w-20 text-right text-sm focus:outline-none"
                            type="number"
                            min="0"
                            step="0.01"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                        <button
                            type="button"
                            disabled={applying}
                            onClick={() => onApplyDiscount(parseFloat(value) || 0)}
                            className="bg-primary text-white px-2 py-1 text-xs rounded disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
            <Row label="Credit">{money(credit)}</Row>
            <Row label={<span className='font-bold'>Total</span>}>
                <span className='font-bold'>{money(total)}</span>
            </Row>
        </div>
    )
}

export default PayAmountsDisplay

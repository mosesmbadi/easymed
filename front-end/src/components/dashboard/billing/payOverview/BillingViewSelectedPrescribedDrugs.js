import React, { useState } from 'react'
import { formatMoney } from '@/functions/money'

const BillingViewSelectedPrescribedDrugs = ({selectedPrescribedDrugs, setSelectedPrescribedDrugs}) => {

    const handleToggle = (itemId, option) => {
        setSelectedPrescribedDrugs(prevState => {
          const itemIndex = prevState.findIndex(item => item.id === itemId);
          if (itemIndex !== -1) {
            return [
              ...prevState.slice(0, itemIndex),
              {
                ...prevState[itemIndex],
                payMethod: option === prevState[itemIndex].payMethod ? "cash" : option,
              },
              ...prevState.slice(itemIndex + 1),
            ];
          }
          return prevState;
        });
    };

    const handleQuantityChange = (itemId, value) => {
        const qty = Math.max(1, parseInt(value) || 1);
        setSelectedPrescribedDrugs(prevState =>
            prevState.map(item =>
                item.id === itemId ? { ...item, quantity: qty } : item
            )
        );
    };

  return (
    <div className='space-y-2'>
        <h2 className='text-primary'> Prescribed Drugs </h2>
        <div className='grid grid-cols-5 gap-1 text-xs font-semibold border-b pb-1 mb-1'>
            <span className='col-span-2'>Item</span>
            <span className='text-center'>Qty</span>
            <span className='text-center'>Pay Mode</span>
            <span className='text-right'>Total</span>
        </div>
        <ul className='space-y-1'>
            {selectedPrescribedDrugs.map(drug => {
                const qty = drug.quantity || 1;
                const unitPrice = parseFloat(drug.sale_price) || 0;
                const total = unitPrice * qty;
                return (
                    <li className='grid grid-cols-5 gap-1 items-center text-xs' key={drug.id}>
                        <span className='col-span-2'>{drug.item_name}</span>
                        <input
                            type='number'
                            min={1}
                            value={qty}
                            onChange={e => handleQuantityChange(drug.id, e.target.value)}
                            className='border rounded px-1 py-0.5 w-full text-center focus:outline-none'
                        />
                        <div className='flex gap-2 justify-center'>
                            <label className='flex items-center gap-1'>
                                <input
                                    type='checkbox'
                                    onClick={() => handleToggle(drug.id, 'mobile_money')}
                                    checked={drug.payMethod === 'mobile_money'}
                                    readOnly
                                />
                                <span className='text-success'>M-Pesa</span>
                            </label>
                            <label className='flex items-center gap-1'>
                                <input
                                    type='checkbox'
                                    onClick={() => handleToggle(drug.id, 'insurance')}
                                    checked={drug.payMethod === 'insurance'}
                                    readOnly
                                />
                                <span className='text-orange-500'>Ins.</span>
                            </label>
                        </div>
                        <span className='text-right font-medium'>{formatMoney(total)}</span>
                    </li>
                );
            })}
        </ul>
        <div className='flex justify-end text-xs font-semibold border-t pt-1 mt-1'>
            <span>Grand Total:&nbsp;</span>
            <span>
                {formatMoney(
                    selectedPrescribedDrugs.reduce((sum, drug) => {
                        const qty = drug.quantity || 1;
                        return sum + (parseFloat(drug.sale_price) || 0) * qty;
                    }, 0)
                )}
            </span>
        </div>
    </div>
  )
}

export default BillingViewSelectedPrescribedDrugs
import React, { useState } from 'react'
import { formatMoney } from '@/functions/money'

const BillingViewSelectedPrescribedDrugs = ({selectedPrescribedDrugs, setSelectedPrescribedDrugs}) => {

    const handleToggle = (itemId, option) => {
        setSelectedPrescribedDrugs(prevState => {
          const itemIndex = prevState.findIndex(item => item.id === itemId);
      
          if (itemIndex !== -1) {
            return [
              ...prevState.slice(0, itemIndex), // All items before the updated item
              {
                ...prevState[itemIndex],
                payMethod: option === prevState[itemIndex].payMethod ? "cash" : option, // Add paymentMethod selected and cash if unselected
              },
              ...prevState.slice(itemIndex + 1), // All items after the updated item
            ];
          }
      
          // If the item is not found, return the original state
          return prevState;
        });
      };

  return (
    <div className='space-y-2'>
        <h2 className='text-primary'> Prescribed Drugs </h2>
        <ul>
            {selectedPrescribedDrugs.map(drug => (
                <li className='flex justify-between text-xs' key={drug.id}>
                    <span className='w-full'>{drug.item_name}</span> 
                    <div className='flex gap-2 text-xs w-full px-2'>
                        <div className='flex gap-2 text-xs'>
                        <p
                            className={`text-success ${drug.payMethod === 'mpesa' ? 'font-bold' : ''}`}
                           
                        >
                            M-Pesa
                        </p>
                        <input  onClick={() => handleToggle(drug.id, 'mpesa')} type='checkbox' checked={drug.payMethod === 'mpesa'} />
                        </div>
                        <div className='flex gap-2 text-xs'>
                        <p
                            className={`text-orange ${drug.payMethod === 'insurance' ? 'font-bold' : ''}`}
                            
                        >
                            Insurance
                        </p>
                        <input onClick={() => handleToggle(drug.id, 'insurance')} type='checkbox' checked={drug.payMethod === 'insurance'} />
                        </div>
                    </div>
                    <span className='w-full flex justify-end'>{formatMoney(drug.sale_price)}</span>
                </li>
            ))}
        </ul>
    </div>
  )
}

export default BillingViewSelectedPrescribedDrugs
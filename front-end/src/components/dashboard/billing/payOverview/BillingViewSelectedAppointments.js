import React, { useState } from 'react'
import { formatMoney } from '@/functions/money'

const BillingViewSelectedAppointments = ({selectedAppointments, setSelectedAppointments}) => {
    const [selectedPayMethodOptions, setSelectedPayMethodOptions] = useState({});

    const handleToggle = (itemId, option) => {
        setSelectedAppointments(prevState => {

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
        <h2 className='text-primary'> Appointments </h2>
        <ul>
            {selectedAppointments.map(appointment=> (
                <li className='flex justify-between text-xs' key={appointment.id}>
                <span className='w-full'>{appointment.item_name}</span>
                <div className='flex gap-2 text-xs w-full px-2'>
                    <div className='flex gap-2 text-xs'>
                    <p
                        className={`text-success ${appointment.payMethod === 'mpesa' ? 'font-bold' : ''}`}
                        
                    >
                        M-Pesa
                    </p>
                    <input onClick={() => handleToggle(appointment.id, 'mpesa')} type='checkbox' checked={appointment.payMethod === 'mpesa'} />
                    </div>
                    <div className='flex gap-2 text-xs'>
                    <p
                        className={`text-orange ${appointment.payMethod === 'insurance' ? 'font-bold' : ''}`}
                        
                    >
                        Insurance
                    </p>
                    <input onClick={() => handleToggle(appointment.id, 'insurance')} type='checkbox' checked={appointment.payMethod === 'insurance'} />
                    </div>
                </div>
                <span className='w-full flex justify-end'>{formatMoney(appointment.sale_price)}</span>
                </li>
            ))}
        </ul>
    </div>
  )
}

export default BillingViewSelectedAppointments
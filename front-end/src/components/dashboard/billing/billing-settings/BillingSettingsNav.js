import React, { useState } from 'react'
import { Container } from '@mui/material'

import Insurance from './Insurance'
import InsurancePrices from './insurancePrices'
import PayModes from './PayModes'

const BillingSettingsNav = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;
  return (
    <Container maxWidth="xl" className="py-2">
    <section className="mb-2">
      <div className="w-full py-1 px-2 flex items-center gap-4 text-center">
        <div>
          <p
            className={`${
              currentTab === 0
                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                : "cursor-pointer text-center p-4"
            }`}
            onClick={() => setCurrentTab(0)}
          >
            Insurances
          </p>
        </div>
        <div>
          <p
            className={`${
              currentTab === 1
                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                : "cursor-pointer text-center p-4"
            } `}
            onClick={() => setCurrentTab(1)}
          >
            Insurance prices
          </p>
        </div>
        <div>
          <p
            className={`${
              currentTab === 2
                ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                : "cursor-pointer text-center p-4"
            } `}
            onClick={() => setCurrentTab(2)}
          >
            Payment Modes
          </p>
        </div>
      </div>
    </section>
    <div className="mt-2">
      {currentTab === 0 && <Insurance />}
      {currentTab === 1 && <InsurancePrices />}
      {currentTab === 2 && <PayModes />}
    </div>
  </Container>
  )
}

export default BillingSettingsNav
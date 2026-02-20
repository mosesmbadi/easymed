import React, { useState } from 'react'
import { Container } from '@mui/material'

import TestPanels from './TestPanels'
import LabEquipments from './LabEquipments'
import TestProfile from './TestProfile'
import Specimens from './Specimens'
import ReferenceValues from './ReferenceValues'
import ProfessionalInterpretation from './ProfessionalInterpretation'

const LabSettingsNav = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;
  return (
    <>
      <section className="mb-2">
        <div className="w-full py-1 px-2 flex items-center gap-4 text-center">
          <div>
            <p
              className={`${currentTab === 0
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                } `}
              onClick={() => setCurrentTab(0)}
            >
              Specimens
            </p>
          </div>

          <div>
            <p
              className={`${currentTab === 1
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                } `}
              onClick={() => setCurrentTab(1)}
            >
              Test Profiles
            </p>
          </div>

          <div>
            <p
              className={`${currentTab === 2
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                } `}
              onClick={() => setCurrentTab(2)}
            >
              Lab Equipments
            </p>
          </div>

          <div>
            <p
              className={`${currentTab === 3
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                }`}
              onClick={() => setCurrentTab(3)}
            >
              Test Panels
            </p>
          </div>

          <div>
            <p
              className={`${currentTab === 4
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                } `}
              onClick={() => setCurrentTab(4)}
            >
              Reference Values
            </p>
          </div>

          <div>
            <p
              className={`${currentTab === 5
                  ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                  : "cursor-pointer text-center p-4"
                } `}
              onClick={() => setCurrentTab(5)}
            >
              Professional Interpretation
            </p>
          </div>
        </div>
      </section>
      <div className="mt-2">
        {currentTab === 0 && <Specimens />}
        {currentTab === 1 && <TestProfile />}
        {currentTab === 2 && <LabEquipments />}
        {currentTab === 3 && <TestPanels />}
        {currentTab === 4 && <ReferenceValues />}
        {currentTab === 5 && <ProfessionalInterpretation />}
      </div>
    </>
  )
}

export default LabSettingsNav
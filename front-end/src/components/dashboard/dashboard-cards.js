import React from 'react'
import { Grid } from '@mui/material'
import { AiOutlineRight } from "react-icons/ai";

const DashboardCards = ({dashData, index}) => {
  return (
    <Grid item md={4} xs={12}>
      <section
        className={`${
          index === 1
            ? "bg-white shadow-xl"
            : "bg-card shadow-xl text-white "
        } rounded h-[10vh]`}
        >
        <div className="p-1 h-[8vh] space-y-0">
          <p className="text-sm">{dashData?.label}</p>
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-xl">{dashData?.number}</h1>
            <div className="flex items-center">
              <p className="text-xs font-thin underline">
                {dashData?.waiting} {dashData?.status}
              </p>
              <AiOutlineRight />
            </div>
          </div>
        </div>
        <div
          className={`${
            index === 1 ? "bg-background" : "bg-cardSecondary "
          } rounded-br rounded-bl h-[4vh] p-2 flex items-center justify-between text-xs font-thin`}
        >
          <p>{dashData?.condition}</p>
          <p>{dashData?.condition_number}</p>
        </div>
      </section>
    </Grid>
  )
}

export default DashboardCards
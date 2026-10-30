import React from 'react'
import DrugsInfo from "./Drugs";

const RightInventory = () => {
  return (
    <section className="space-y-1 my-4">
        <div className="flex items-center justify-between">
            <h1 className="uppercase text-xs font-semibold">Low quantity drugs</h1>
            <h1 className="text-sm">See All</h1>
        </div>
        <DrugsInfo displayNUmber={6}/>
    </section>
  )
}

export default RightInventory
import React from 'react'
import AddGroup from './AddGroup'
import GroupsAndPermissions from './GroupsAndPermissions'

const Permissions = () => {

  return (
    <section className="space-y-2 rounded-lg min-h-[80vh] p-2 flex flex-col gap-4">
      <div className='bg-white p-4 rounded-lg'>
        <AddGroup/>
      </div>
      <div className='bg-white p-4 rounded-lg'>
        <GroupsAndPermissions/>
      </div>
    </section>
  )
}

export default Permissions
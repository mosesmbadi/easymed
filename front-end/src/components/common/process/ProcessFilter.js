import React from 'react'

const ProcessFilter = ( { selectedFilter, setProcessFilter } ) => {
    const filters = ['all', 'reception', 'triage', 'doctor', 'pharmacy', 'lab']

    const setSelectedFilter = (filter) => {
        if(filter === 'all'){
            setProcessFilter('')

        }else{
            setProcessFilter(filter)
        }        
    }

    const processFilters = filters.map((filter)=> {
        return(
            <li onClick={()=>setSelectedFilter(filter)} className={`p-2 cursor-pointer ${filter === selectedFilter || (selectedFilter === '' && filter === 'all')  ? 'bg-primary text-white capitalize rounded-lg' : 'bg-light capitalize rounded-lg' }`} key={filter}>{filter}</li>
        )
    })

  return (
    <div className='mb-4'>
        <ul className='flex gap-4'>
            {processFilters} 
        </ul> 
    </div>
  )
}

export default ProcessFilter
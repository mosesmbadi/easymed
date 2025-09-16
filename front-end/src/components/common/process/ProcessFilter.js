import React, {useState} from 'react'
import { Grid } from '@mui/material'
import SearchItemFilterPopover from './SearchItemFilterPopover'

const ProcessFilter = ( { items, selectedFilter, setProcessFilter, selectedSearchFilter, setSelectedSearchFilter } ) => {
    const filters = ['all', 'reception', 'triage', 'doctor', 'pharmacy', 'lab']
    const [searchQuery, setSearchQuery] = useState("")

    const setSelectedFilter = (filter, search) => {
        if(filter === 'all'){
            setProcessFilter({
                search: search,
                track: ""
            })

        }else{
            setProcessFilter({
                search: search,
                track: filter
            })
        }        
    }

    const processFilters = filters.map((filter)=> {
        return(
            <li onClick={()=>setSelectedFilter(filter, "")} className={`p-2 cursor-pointer ${filter === selectedFilter.track || (selectedFilter.track === '' && filter === 'all')  ? 'bg-primary text-white capitalize rounded-lg' : 'bg-light capitalize rounded-lg' }`} key={filter}>{filter}</li>
        )
    })

  return (
    <div className='mb-4'>
        <ul className='flex gap-4 mb-2'>
            {processFilters} 
        </ul> 
        <Grid container spacing={2} className="my-2">
            <Grid item md={12} xs={12}>
                <div className='flex items-center border rounded-lg border-primary'>
                    <SearchItemFilterPopover 
                        selectedSearchFilter={selectedSearchFilter} 
                        setSelectedSearchFilter={setSelectedSearchFilter}
                        items={items}
                    />
                    <input
                        className="py-3 w-full px-4 focus:outline-none placeholder-font font-thin text-sm"
                        onChange={(e) => setSelectedFilter(selectedFilter.track, e.target.value)}
                        value={selectedFilter.search}
                        fullWidth
                        placeholder={`Search ${selectedSearchFilter?.value ?  `By ${selectedSearchFilter?.label}` : "All" }...`}
                    />
                </div>
            </Grid>
        </Grid>
    </div>
  )
}

export default ProcessFilter
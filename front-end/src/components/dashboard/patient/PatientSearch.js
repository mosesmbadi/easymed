import React, {useState} from 'react'
import { Grid } from '@mui/material'
import SearchPatientFilterPopover from './SearchPatientFilterPopover'

const PAtientSearch = ( { selectedFilter, setProcessFilter, selectedSearchFilter, setSelectedSearchFilter } ) => {
    const filters = ['all', 'reception', 'triage', 'doctor', 'pharmacy', 'lab']
    const [searchQuery, setSearchQuery] = useState("")

    const setSelectedFilter = (search) => {
        setProcessFilter({search: search})
    }

  return (
    <div className='w-full'>
        <Grid container spacing={2} className="my-2">
            <Grid item md={12} xs={12}>
                <div className='flex items-center border rounded-lg border-primary'>
                    <SearchPatientFilterPopover
                        selectedSearchFilter={selectedSearchFilter} 
                        setSelectedSearchFilter={setSelectedSearchFilter}
                    />
                    <input
                        className="py-3 w-full px-4 focus:outline-none placeholder-font font-thin text-sm"
                        onChange={(e) => setSelectedFilter(e.target.value)}
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

export default PAtientSearch
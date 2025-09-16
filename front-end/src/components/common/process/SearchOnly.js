import React, {useState} from 'react'
import { Grid } from '@mui/material'
import SearchItemFilterPopover from './SearchItemFilterPopover'

const SearchOnlyFilter = ( { items, selectedFilter, setProcessFilter, selectedSearchFilter, setSelectedSearchFilter } ) => {

    const setSelectedFilter = (filter, search) => {
        setProcessFilter({
            search: search
        })
    }

  return (
    <div className='mb-4'>
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

export default SearchOnlyFilter
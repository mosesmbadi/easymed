import React, { useState } from 'react'
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { CiFilter } from "react-icons/ci";

const SearchItemFilterPopover = ({selectedSearchFilter, setSelectedSearchFilter}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const filterOpen = Boolean(anchorEl);

    const items = [
        {label: "None", value: ""},
        {label: "Patient First Name", value: "patient__first_name"},
        {label: "Patient Second Name", value: "patient__second_name"},
        {label: "Patient Number", value: "patient_number"},
        {label: "Track Number", value: "track_number"},
        {label: "Doctor First Name", value: "doctor__first_name"},
        {label: "Doctor Last Name", value: "doctor__last_name"},
        {label: "Lab Tech First Name", value: "lab_tech__first_name"},
        {label: "Lab Tech Last Name", value: "lab_tech__last_name"},
        {label: "Pharmacist First Name", value: "pharmacist__first_name"},
        {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
    ]

    const handlePopoverOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const handleFilterClick = (event) => {
        if(anchorEl){
            handlePopoverClose()    
        }else {
            handlePopoverOpen(event)
        }

    }

    const selectFilter = (item) => {
        setSelectedSearchFilter(item)
        handlePopoverClose()
    }

  return (
        <div className="flex relative w-auto whitespace-nowrap">
            <Typography
                aria-owns={filterOpen ? 'mouse-over-popover' : undefined}
                aria-haspopup="true"
                onClick={handleFilterClick}
            >
                <div class="border p-2 w-auto rounded-lg flex items-center gap-2 cursor-pointer border-primary">
                    <CiFilter />
                    <p>{selectedSearchFilter?.value ? selectedSearchFilter?.label : "Filter"}</p>
                </div>
            </Typography>
            <Popover
                id="mouse-over-popover"
                open={filterOpen}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <Typography sx={{ p: 1 }}>
                    <div 
                        className='flex flex-wrap max-w-xs p-2 w-96'
                    >
                    {items.map((item, index) => (
                        <span 
                            onClick={()=>selectFilter(item)} 
                            key={index} 
                            className={ `p-2 mr-2 mb-2 text-xs cursor-pointer ${item.value === selectedSearchFilter.value ? 'bg-primary text-white rounded-lg' : 'bg-light rounded-lg' }`}
                        >
                            {item.label}
                        </span>
                    ))}
                    </div>
                </Typography>
            </Popover>
        </div>
  )
}

export default SearchItemFilterPopover
import React, { useState } from 'react'
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { CiFilter } from "react-icons/ci";

const SearchPatientFilterPopover = ({selectedSearchFilter, setSelectedSearchFilter}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const filterOpen = Boolean(anchorEl);

    const items = [
        {label: "None", value: ""},
        {label: "Patient ID", value: "unique_id"},
        {label: "First Name", value: "first_name"},
        {label: "Second Name", value: "second_name"},
        {label: "Email", value: "email"},
        {label: "Phone Number", value: "phone"},
        {label: "Insurance", value: "insurances__name"},
        {label: "Next of Kin First Name", value: "next_of_kin__first_name"},
        {label: "Next of Kin Second Name", value: "next_of_kin__second_name"},
        {label: "Next of Kin Phone Number", value: "next_of_kin__contacts__tel_no"},
        {label: "Next of Kin Email", value: "next_of_kin__contacts__email_address"},
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

export default SearchPatientFilterPopover
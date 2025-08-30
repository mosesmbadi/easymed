import React, { useState } from 'react'
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

const ShowInsurancesPopover = ({ data }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    let insuranceString = ''
    const insuranceOpen = Boolean(anchorEl);
    const insuranceCount = data.insurances.length;

    const handlePopoverOpen = (event) => {
    setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
    setAnchorEl(null);
    };
    
    data.insurances.forEach((insurance)=> {
        insuranceString = insuranceString + `${insurance.name}, `
    })
    
    const displayString = `${data.insurances[0].name} ${insuranceCount > 1 ? `+${insuranceCount - 1} more` : ''}`;

  return (
        <div className="flex relative">
            <Typography
                aria-owns={insuranceOpen ? 'mouse-over-popover' : undefined}
                aria-haspopup="true"
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
            >
                {displayString}
            </Typography>
            <Popover
                id="mouse-over-popover"
                sx={{ pointerEvents: 'none' }}
                open={insuranceOpen}
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
                <Typography sx={{ p: 1 }}>{insuranceString}</Typography>
            </Popover>
        </div>
  )
}

export default ShowInsurancesPopover
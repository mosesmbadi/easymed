import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { MenuItem,Menu } from '@mui/material';

const CmtDropdownMenu = ({ TriggerComponent, items, onItemClick }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const open = Boolean(anchorEl);

  useEffect(() => {
    setMenuItems(items);
  }, [items]);

  const openMenu = event => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const closeMenu = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (item, selectedIndex, event) => {
    event.stopPropagation();
    let updatedItem = { ...item };

    if (item.onClick && typeof item.onClick === 'function') {
      updatedItem = item.onClick(item);
    } else if (onItemClick && typeof onItemClick === 'function') {
      updatedItem = onItemClick(item);
    }

    if (updatedItem) {
      let hasChange = false;
      const newMenuItems = menuItems?.map((item, index) => {
        if (selectedIndex === index) {
          hasChange = true;
          item = updatedItem;
        }
        return item;
      });

      if (hasChange) setMenuItems(newMenuItems);
    }

    closeMenu();
  };

  return (
    <React.Fragment>
      <div className="pointer">
        <TriggerComponent.type {...TriggerComponent.props} onClick={openMenu} />
      </div>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {menuItems?.map((item, index) => {
          return (
            <MenuItem key={index} disabled={item.disabled} onClick={event => handleMenuItemClick({ ...item }, index, event)}>
              {item.icon}
              <div className="ml-2">{item.label}</div>
            </MenuItem>
          );
        })}
      </Menu>
    </React.Fragment>
  );
};

CmtDropdownMenu.propTypes = {
  items: PropTypes.array.isRequired,
  TriggerComponent: PropTypes.element.isRequired,
  onItemClick: PropTypes.func,
};

export default CmtDropdownMenu;

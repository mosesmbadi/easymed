import React, {useEffect, useState} from "react";
import Link from "next/link"
import { AiOutlineSearch } from "react-icons/ai";
import { RiMessage2Fill } from "react-icons/ri";
import { IoMdNotifications } from "react-icons/io";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TextField } from "@mui/material";
import { useAuth } from "@/assets/hooks/use-auth";
import { useContext } from "react";
import { authContext } from "@/components/use-context";
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import { VscAccount } from "react-icons/vsc";
import { CiBellOn } from "react-icons/ci";
import WebSocketComponent from "@/components/notifications/Notifications";


const TopSection = () => {
  const [notification, setNotification] = useState([]);
  const [mounted, setMounted] = useState(false);
  const { logoutUser } = useContext(authContext);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [anchorEl2, setAnchorEl2] = React.useState(null);
  const [anchorEl3, setAnchorEl3] = useState(null)
  const [viewNotifications, setViewNotification]=useState(false)
  const token = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleViewNotifications = () => {
    setViewNotification(!viewNotifications)
  }

  const handleClick2 = (event) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClick3 = (event) => {
    setAnchorEl3(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleClose3 = () => {
    setAnchorEl3(null);
  };

  const open = Boolean(anchorEl);
  const open2 = Boolean(anchorEl2);
  const open3 = Boolean(anchorEl3);
  const id = open2 ? "simple-popover" : undefined;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget); // Anchor the menu to the current target (the image)
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
        <section className="flex items-center gap-4 sticky top-0 h-[10vh] bg-white z-40 md:bg-opacity-30 md:backdrop-filter md:backdrop-blur-lg p-2">
          {/* <span style={{fontSize: '8px'}} className="absolute top-0 left-0">22 Sept 2023</span> */}
          <div className="flex items-center gap-4 border-r-2 pr-2 border-primary">
            <AiOutlineSearch
              onClick={handleClick2}
              className="text-2xl cursor-pointer"
            />
            {/* <RiMessage2Fill className="text-2xl cursor-pointer" /> */}
            <div className="flex items-center">
              <CiBellOn onClick={handleClick3} className="text-3xl cursor-pointer" />
              {notification.length > 0 && (
                <p className="text-warning">{notification.length}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <VscAccount 
                onClick={handleClick}
                className="h-8 w-8 rounded-full cursor-pointer"
              />
            </div>
            <div className="text-xs">
              <p className="font-semibold" suppressHydrationWarning>
                {mounted ? token?.first_name : ""}
              </p>
              {/* <p>Surgeon</p> */}
            </div>
          </div>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Link href="/account/profile">
              <MenuItem onClick={handleClose}>
                <Avatar /> Profile
              </MenuItem>
            </Link>
            <Link href='/account/announcements'>
              <MenuItem onClick={handleClose}>
                <Avatar /> Announcements
              </MenuItem>
            </Link>
            <Divider />
            <MenuItem onClick={handleClose}>
              <ListItemIcon>
                <PersonAdd fontSize="small" />
              </ListItemIcon>
              Add another account
            </MenuItem>
            <Link href='/dashboard/admin-interface'>
              <MenuItem onClick={handleClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Settings
              </MenuItem>
            </Link>
            <MenuItem onClick={logoutUser}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>

          <div>
            <Popover
              id={id}
              open={open2}
              anchorEl={anchorEl2}
              onClose={handleClose2}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
            >
              {/* <form className="p-4 space-y-3"> */}
              <section className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <TextField fullWidth label="Search Patient" type="text" />
                  <TextField fullWidth label="Search Doctor" type="text" />
                </div>
                <div className="flex items-center gap-3">
                  <DatePicker size="small" label="From Date" />
                  <DatePicker size="small" label="To Date" />
                </div>
                <button
                  onClick={handleClose2}
                  className="bg-[#02273D] px-3 py-3 rounded text-white w-full"
                >
                  Search
                </button>
              </section>
              {/* </form> */}
            </Popover>
          </div>
          <div className={`${viewNotifications ? "block" : "hidden"}`}>
            <WebSocketComponent notifications={notification} setNotifications={setNotification}/>
          </div>
          <Popover
              // id={id}
              open={open3}
              anchorEl={anchorEl3}
              onClose={handleClose3}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
            >
            <div className='w-full p-4 space-y-3'>
              <p>New notifications:</p>
              <ul>
                {notification?.map((notification, index) => (
                  <li className="hover:bg-gray my-2 cursor-pointer py-1" key={index}>{notification.message}</li>
                ))}
              </ul>
            </div>              
            </Popover>
        </section>
    </>
  );
};

export default TopSection;

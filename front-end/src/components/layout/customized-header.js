import { Container, Grid } from "@mui/material";
import React, { useContext, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { Drawer } from "@/assets/drawer";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { BsChevronDown } from "react-icons/bs";
import { authContext } from "../use-context";
import { useAuth } from "@/assets/hooks/use-auth";
import { FaUserCircle } from "react-icons/fa";
import { AdminData as adminData } from '@/assets/menu'
import DashboardCards from "../dashboard/dashboard-cards";


const CustomizedHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { logoutUser } = useContext(authContext);
  const token = useAuth();

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget); // Anchor the menu to the current target (the image)
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const dashboardCards = adminData().map((data, index)=> <DashboardCards dashData={data} index={index} key={`dashboard-card-${index}`}/>)

  return (
    <>
      <section className="sticky top-0 py-2 md:p-0 bg-white shadow-sm h-[10vh] md:h-[10vh]">
        <Container maxWidth="xl">
          <section className="flex items-center md:justify-end justify-between gap-4">
            <div className="md:hidden block">
              <AiOutlineMenu
                className="text-2xl cursor-pointer text-white"
                onClick={() => setIsOpen(true)}
              />
              <Drawer {...{ isOpen, setIsOpen }} />
            </div>
            {/* <Grid container spacing={1} className="my-2 hidden md:block">
              <Grid container spacing={2}>
                {dashboardCards}
              </Grid>
            </Grid> */}
            <div className="flex items-center gap-2">
              <FaUserCircle className="w-6 h-6 text-primary" />
              <span className="text-primary text-sm">{token?.first_name}</span>
              <BsChevronDown
                onClick={handleClick}
                className="text-primary cursor-pointer"
              />
            </div>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "left",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "left",
              }}
              MenuListProps={{
                "aria-labelledby": "basic-button",
              }}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={logoutUser}>Logout</MenuItem>
            </Menu>
          </section>
        </Container>
      </section>
    </>
  );
};

export default CustomizedHeader;

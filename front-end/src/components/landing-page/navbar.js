import React, { useState, useContext } from "react";
import { Drawer } from "./drawer";
import { AiOutlineMenu } from "react-icons/ai";
import Link from "next/link";
import { useAuth } from "@/assets/hooks/use-auth";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { IoChevronDownOutline } from "react-icons/io5"
import { authContext } from "../use-context";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const auth = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const { logoutUser } = useContext(authContext);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <section className="flex items-center justify-between h-[10vh]">
      <div>
        <h1 className="text-white text-2xl">Logo</h1>
      </div>
      <div className="md:block hidden">
        <ul className="flex items-center gap-4 text-white">
          <li>Home</li>
          <li>About</li>
          <li>Services</li>
          <li>Doctors</li>
          <li>Blog</li>
        </ul>
      </div>
      {auth?.first_name ? (
        <div className="flex items-center gap-2">
          <p className="">{auth.first_name}</p>
          <IoChevronDownOutline
            onClick={handleClick}
            className="text-white text-xl font-bold cursor-pointer"
          />
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
            <MenuItem onClick={handleClose}><Link href="/patient-profile">Profile</Link></MenuItem>
            <MenuItem onClick={logoutUser}>Logout</MenuItem>
          </Menu>
        </div>
      ) : (
        <div className="md:block hidden">
          <Link
            href="/auth/login"
            className="bg-primary px-5 py-3 text-white mx-2"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="bg-primary px-5 py-3 text-white mx-2"
          >
            Register
          </Link>
        </div>
      )}

      <div className="md:hidden block py-4">
        <AiOutlineMenu
          className="text-secondary text-2xl cursor-pointer"
          onClick={() => setIsOpen(true)}
        />
        <Drawer isOpen={isOpen} setIsOpen={setIsOpen} />
      </div>
    </section>
  );
};

export default Navbar;

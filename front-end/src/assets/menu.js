import React from "react";
import { BiSolidDashboard } from "react-icons/bi";
import { HiUsers } from "react-icons/hi";
import { RiMessage2Fill } from "react-icons/ri";
import { BsCalendarEvent } from "react-icons/bs";
import { MdLocalPharmacy } from "react-icons/md";
import { FaWheelchair } from "react-icons/fa";
import { FaBed } from "react-icons/fa";
import { FaClockRotateLeft, FaCodePullRequest } from "react-icons/fa6";
import { GrAdd } from 'react-icons/gr'
import { MdInventory2 } from 'react-icons/md'
import { BiSolidPurchaseTagAlt } from 'react-icons/bi'
import { FaMoneyBillAlt } from 'react-icons/fa'
import { FaProductHunt, FaLock, FaUser } from 'react-icons/fa'
import { TbBrandBandlab } from 'react-icons/tb'
import { FaMoneyBillWave } from "react-icons/fa";
import { useSelector } from "react-redux";
import { BsReception4 } from "react-icons/bs";
import { LiaUserNurseSolid } from "react-icons/lia";
import { FaUserDoctor } from "react-icons/fa6";
import { BsCapsule } from "react-icons/bs";
import { GiMicroscope } from "react-icons/gi";
import { FaImage } from "react-icons/fa";
import { MdPersonAddAlt1 } from "react-icons/md";

// Side NavBar

export const menus = [
  {
    label: "Check-In",
    href: "/dashboard/reception/check-in",
    icon: <MdPersonAddAlt1 className="text-xl" />,
  },
  {
    label: "Patients",
    href: "/dashboard/patients",
    icon: <HiUsers className="text-xl" />,
  },
  // {
  //   label: "Reception",
  //   href: "/dashboard",
  //   icon: <BiSolidDashboard className="text-xl" />,
  // },
  {
    label: "Nursing Station",
    href: "/dashboard/nursing-station",
    icon: <LiaUserNurseSolid className="text-xl" />,
  },
  {
    label: "Doctor Desk",
    href: "/dashboard/doctor-desk",
    icon: <FaUserDoctor className="text-xl" />,
  },
  {
    label: "Laboratory",
    href: "/dashboard/laboratory",
    icon: <GiMicroscope className="text-xl" />,
  },
  {
    label: "Phamarcy",
    href: "/dashboard/phamarcy",
    icon: <BsCapsule className="text-xl" />,
  },
  {
    label: "Radiology",
    href: "/dashboard/radiology",
    icon: <FaImage className="text-xl" />,
  },
  {
    label: "In-patient",
    href: "/dashboard/admit/patients",
    icon: <FaBed className="text-xl" />,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: <FaMoneyBillAlt className="text-xl" />,
    children: [
      {
        label: "Accounts Receivable",
        href: "/dashboard/finance/accounts-receivable",
        icon: <FaMoneyBillWave className="" />,
      },
      {
        label: "Accounts Payable",
        href: "/dashboard/finance/accounts-payable",
        icon: <FaMoneyBillWave className="" />,
      },
    ],
  },

  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: <MdInventory2 className="text-xl" />,
  },
];

export const AccMenus = [
  {
    label: "Announcements",
    href: "/account/announcements",
    icon: <BsCalendarEvent className="text-xl" />,
  },
  {
    label: "Profile",
    href: "/account/profile",
    icon: <FaUser className="text-xl" />,
  },
  {
    label: "Security",
    href: "/account/profile/security",
    icon: <FaLock className="text-xl" />,
  },
];

export const dashboardData = [
  {
    label: "Patients waiting",
    number: 12,
    icon: <FaWheelchair className="text-xl" />,
  },
  {
    label: "Doctors on duty",
    number: 44,
    icon: <FaClockRotateLeft className="text-left" />,
  },
  {
    label: "Test Requests",
    number: 37,
    icon: <FaCodePullRequest className="text-xl" />,
  },
];
export const AdminData = ()=> {
  // get data from redux store for display
  const { doctors } = useSelector((store) => store.doctor);
  const { patients } = useSelector((store) => store.patient);
  const { labRequests } = useSelector((store) => store.laboratory);

  return([
    {
      label: "No. of Patients",
      number: patients.length,
      waiting: 17,
      status: 'Patients waiting',
      condition: 'Patients Discharged',
      condition_number: 13
    },
    {
      label: "No. of Doctors",
      number: doctors.length,
      waiting: 3,
      status: 'Doctors On leave',
      condition: 'Doctors On Duty',
      condition_number: 41
    },
    {
      label: "Test Requests",
      number: labRequests.length,
      waiting: 12,
      status: 'Tests Approved',
      condition: 'Test Requests Pending',
      condition_number: 4
    },
  ]);

}
export const doctorData = [
  {
    name: "Dr. Patrick",
    specialisation: 'Surgeon',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Jairus",
    specialisation: 'Optician',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Patrick",
    specialisation: 'Psychiatry',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Patrick",
    specialisation: 'Psychiatry',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Patrick",
    specialisation: 'Psychiatry',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Jairus",
    specialisation: 'Dentist',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Jairus",
    specialisation: 'Dentist',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Jairus",
    specialisation: 'Dentist',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
  {
    name: "Dr. Jairus",
    specialisation: 'Dentist',
    image: "./images/doc.jpg",
    status: 'On duty',
  },
];

export const bookedData = [
  {
    name: "Joseph Mmbone",
    date: '12th July 2024',
  },
  {
    name: "Mary Moraa",
    date: '12th July 2024',
  },
  {
    name: "Derrick Kimani",
    date: '12th July 2024',
  },
  {
    name: "Annete Mwihaki",
    date: '12th July 2024',
  },
];

export const inventoryData = [
  {
    label: "Today's Sales",
    number: 320,
    icon: <FaMoneyBillAlt className="" />,
  },
  {
    label: "Purchases",
    number: 28,
    icon: <BiSolidPurchaseTagAlt className="" />,
  },
  {
    label: "Total Products",
    number: 3222,
    icon: <FaProductHunt className="" />,
  },
];

export const pharmacyDisplayStats = [
  {
    label: "Drugs Feedback",
    icon: "/images/svgs/message.svg",
    figures: 13
  },
  {
    label: "Close Expiring",
    icon: "/images/svgs/expire.svg",
    figures: 13
  },
  {
    label: "Out of stock",
    icon: "/images/svgs/outstock.svg",
    figures: 13
  },
]

export const InventoryDisplayStats = () => {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const { purchaseOrders } = useSelector(({ inventory }) => inventory)
  const { invoiceItems } = useSelector(({ billing }) => billing)

  const todayPurchases = purchaseOrders.filter((purchase) => {
    const purchaseDate = new Date(purchase.date_created);
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth();
    const purchaseDay = purchaseDate.getDate();
  
    return todayYear === purchaseYear && todayMonth === purchaseMonth && todayDay === purchaseDay;
  });

  const todaySales = invoiceItems.filter((sale) => {
    const saleDate = new Date(sale.item_created_at);
    const saleYear = saleDate.getFullYear();
    const saleMonth = saleDate.getMonth();
    const saleDay = saleDate.getDate();
  
    return todayYear === saleYear && todayMonth === saleMonth && todayDay === saleDay;
  });

  console.log(invoiceItems)


  return ([
    {
      label: "Today's Sales",
      icon: "/images/svgs/sales.svg",
      figures: todaySales.length
    },
    {
      label: "Purchases",
      icon: "/images/svgs/purchases.svg",
      figures: todayPurchases.length
    },
    {
      label: "Slow Moving",
      icon: "/images/svgs/slow-moving.svg",
      figures: 3222
    },
  ])

}


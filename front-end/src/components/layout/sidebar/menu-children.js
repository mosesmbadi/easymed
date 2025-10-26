import React,{useState} from "react"; 
import Link from 'next/link'
import { AiFillCaretRight, AiFillCaretDown} from "react-icons/ai";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";

import { toggleShowMenu } from "@/redux/features/menu";


const MenuChild = ({ collapsed, menu, index }) => {
    // const [showChild,setShowChild] = useState(true);
    const showChild = useSelector(store => store.menu.showChild)
    const router = useRouter();
    const dispatch = useDispatch();
    const currentPath = router.pathname;

    const icon = showChild == true ? <AiFillCaretDown /> : <AiFillCaretRight />;

    const childMenuClasses = showChild
    ? "transition-max-h ease-in duration-700 max-h-screen"
    : "transition-max-h ease-out duration-700 max-h-0";


  return (
    <li key={index}>
      {!collapsed && menu?.children ? (
        <>
          <span
            onClick={() => dispatch(toggleShowMenu())}
            className="flex text-sm items-center justify-between p-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-6">{menu.icon}</span>{" "}
              <span>{!collapsed && menu.label}</span>
            </div>
            <div>
              <span className="cursor-pointer">{!collapsed && icon}</span>
            </div>
          </span>
        </>
      ) : (
        <>
          <Link
            className=
              {`${(currentPath.includes(menu.href) && 
                menu.href !== "/dashboard") || (currentPath === "/dashboard" && menu.href === "/dashboard") ? 'bg-primary text-white' : ''} flex text-sm items-center gap-2 hover:bg-light hover:text-black rounded py-2 px-2`}
            href={menu.href}
          >
            <span className="w-6">{menu.icon}</span>{" "}
            <span>{!collapsed && menu.label}</span>
          </Link>
        </>
      )}
      {showChild && menu.children && (
        <ul className={`bg-[#F2F2F6] py-1 rounded mx-2 ${childMenuClasses}`}>
          {menu?.children?.map((child, index) => {
            // Active when on the exact child route OR any nested path under it
            const isActive = currentPath === child.href || currentPath.startsWith(child.href + '/');
            return (
              <li key={index} className="px-4 text-xs">
                <Link
                  className={`${isActive ? 'bg-primary text-white rounded p-2' : 'py-2'} flex items-center gap-2`}
                  href={child.href}
                >
                  {/* <span className="text-sm text-white">{child.icon}</span>{" "} */}
                  <span>{!collapsed && child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

export default MenuChild;

import { AiOutlineClose } from "react-icons/ai";
import { menus } from "./menu";

export const Drawer = ({ isOpen, setIsOpen }) => {
  return (
    <>
      <main
        className={
          " fixed overflow-hidden bg-primary bg-opacity-50 inset-0 transform ease-in-out z-50" +
          (isOpen
            ? " transition-opacity opacity-100 duration-500 translate-x-0 z-50  "
            : " transition-all delay-500 opacity-0 translate-x-full z-50  ")
        }
      >
        <section
          className={
            "right-0 md:w-3/12 w-3/4 absolute bg-[#02273D] opacity-100 px-8 py-4 h-screen shadow-xl delay-400 duration-500 ease-in-out transition-all transform  " +
            (isOpen ? " translate-x-0 z-50 " : " translate-x-full ")
          }
        >
          <article className=" text-white space-y-8">
            <div className="flex items-center justify-start px-2">
              <div>
                <AiOutlineClose
                  onClick={() => setIsOpen(false)}
                  className="text-white text-2xl float-right cursor-pointer"
                />
              </div>
            </div>
            <div>
              <ul className="space-y-4 my-4">
                {menus.map((menu, index) => (
                  <li key={index}>
                    <>
                      <span className="flex text-sm items-center justify-between py-2 px-2 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="w-6">{menu.icon}</span>{" "}
                          <span>{menu.label}</span>
                        </div>
                      </span>
                    </>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>
        <section
          className=" w-1/2 h-full cursor-pointer "
          onClick={() => {
            setIsOpen(false);
          }}
        ></section>
      </main>
    </>
  );
};

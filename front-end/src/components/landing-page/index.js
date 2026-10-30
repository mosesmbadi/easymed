import React from "react";
import Navbar from "./navbar";
import LandingVideo from "./landing-video";
import Link from "next/link";
import { useAuth } from "@/assets/hooks/use-auth";

const LandingPage = () => {



  return (
    <section className="heroSection sm:px-24 px-4 py-4">
      <Navbar />
      <section className="flex items-center justify-between h-[84vh]">
        <div className="md:w-7/12 w-full space-y-4">
          <h1 className="text-white md:font-semibold font-thin md:text-4xl text-2xl">
            Providing an Exceptional Patient Experience.
          </h1>
          <p className="text-white font-thin md:text-sm text-xs">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ab
            architecto reprehenderit esse iure enim temporibus id totam quaerat
            laudantium accusantium!
          </p>
          <div className="flex items-center gap-4">
            <button className="border border-white text-white px-4 py-3">
              View Services
            </button>
            <Link href="/book-appointment">
              <button className="border border-white hover:bg-primary hover:text-white hover:border-none text-white px-4 py-3 transition duration-500 hover:scale-105">
                Book Appointment
              </button>
            </Link>
          </div>
        </div>
        <section className="w-5/12 md:block hidden">
          <div className="flex items-center justify-center">
            <LandingVideo />
          </div>
        </section>
      </section>
    </section>
  );
};

export default LandingPage;

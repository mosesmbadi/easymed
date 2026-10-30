import React, { useEffect,useState } from "react";
import { doctorData } from "@/assets/menu";
import { getAllDoctors } from "@/redux/features/doctors";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";

const Doctors = () => {
  const { doctors } = useSelector((store) => store.doctor);
  const dispatch = useDispatch();
  const auth = useAuth();


  useEffect(() => {
    if (auth) {
      dispatch(getAllDoctors(auth));
    }
  }, [auth]);

  return (
    <section className="space-y-1">
      {doctors?.length > 0 ? (
        <>
          {doctors.map((doc, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white shadow-xl rounded-xl px-2 py-1"
            >
              <div className="flex gap-2 items-center">
                <img
                  className="w-6 h-6 rounded-full object-cover"
                  src="/images/doc.jpg"
                  alt=""
                />
                <div className="text-xs flex items-center gap-1">
                  <p>{doc.first_name}</p>
                  <p>{doc.last_name}</p>
                </div>
              </div>
              <div className="text-xs">
                <p className="text-success font-bold">{doc.email}</p>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="my-8">
          <p className="text-center text-warning text-sm">
            No Doctors Available at the moment!
          </p>
        </div>
      )}
    </section>
  );
};

export default Doctors;

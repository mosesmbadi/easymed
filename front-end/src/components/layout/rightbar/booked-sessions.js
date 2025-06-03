import { bookedData } from "@/assets/menu";
import React, { useEffect } from "react";
import { getAllAppointments } from "@/redux/features/appointment";
import { useDispatch, useSelector } from "react-redux";

const BookedSessions = () => {
  const { appointments } = useSelector((store) => store.appointment);
  const dispatch = useDispatch();

  return (
    <>
      <section className="space-y-1">
        {appointments.length > 0 ? (
          <>
            {appointments.map((book, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white shadow-xl rounded-xl p-2"
              >
                <div className="text-xs flex gap-2 items-center">
                  <span>{book.first_name}</span>
                  <span>{book.second_name}</span>
                </div>
                <div className="text-xs text-primary">
                  <p>
                    {new Date(book.appointment_date_time).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="my-8">
            <p className="text-center text-warning text-sm">
              No Booked Sessions Available at the moment!
            </p>
          </div>
        )}
      </section>
    </>
  );
};

export default BookedSessions;

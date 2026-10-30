import React, { useState } from "react";
import { setSelectedAppointment } from "@/redux/features/billing";
import { useSelector,useDispatch } from "react-redux";

const Appointments = ({ item }) => {
  const [selected, setSelected] = useState(false);
  const { selectedAppointments } = useSelector((store) => store.billing);
  const dispatch = useDispatch();


  const handleSelect = () => {
    setSelected(!selected);
    if (!selected) {
      dispatch(setSelectedAppointment([...selectedAppointments, item]));
    } else {
      const updatedSelection = selectedAppointments.filter(
        (appointment) => appointment?.id !== item?.id
      );
      dispatch(setSelectedAppointment(updatedSelection));
    }
  };


  return (
    <div
      onClick={handleSelect}
      className="flex gap-2 cursor-pointer bg-white shadow rounded-xl p-2 my-2"
    >
      <input type="checkbox" className="rounded" checked={selected} />
      <div className="flex items-center gap-2">
        <p className="text-xs">{item?.first_name}</p>
        <p className="text-xs">{item?.second_name}</p>
      </div>
    </div>
  );
};

export default Appointments;

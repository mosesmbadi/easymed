import React, { useState } from "react";
import { setSelectedPrescribedDrug } from "@/redux/features/billing";
import { useDispatch, useSelector } from "react-redux";

const Drugs = ({ item }) => {
  const [selected, setSelected] = useState(false);
  const { selectedPrescribedDrugs } = useSelector((store) => store.billing);
  const dispatch = useDispatch();

  const handleSelect = () => {
    setSelected(!selected);
    if (!selected) {
      dispatch(setSelectedPrescribedDrug([...selectedPrescribedDrugs, item]));
    } else {
      const updatedSelection = selectedPrescribedDrugs.filter(
        (drug) => drug?.dosage !== item?.dosage
      );
      dispatch(setSelectedPrescribedDrug(updatedSelection));
    }
  };

  const formateDate = (date) => {
    const format = new Date(date).toLocaleDateString();

    return format;
  }

  return (
    <div
      onClick={handleSelect}
      className="flex gap-2 cursor-pointer bg-white shadow rounded-xl p-2 my-2"
    >
      <input type="checkbox" className="rounded" checked={selected} />
      <p className="text-xs">{item?.item_name}</p>
    </div>
  );
};

export default Drugs;

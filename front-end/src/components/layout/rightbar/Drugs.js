import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { getLowDrugs } from "@/redux/features/inventory";

const DrugsInfo = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  // console.log("AUTH OBJECT:", auth); // check if token is there


  const { drugs } = useSelector((state) => state.inventory);

  useEffect(() => {
    dispatch(getLowDrugs(auth));
  }, [dispatch, auth]);

  const drugsInfo = drugs?.slice().map((item, index) => (
    <li
      key={`drugs-info-${index}`}
      className="flex justify-between px-4 text-xs my-2 rounded"
    >
      <p className="w-full">{item.name}</p>
      <p className="text-end w-full">{item.quantity}</p>
    </li>
  ));

  return <ul>{drugsInfo}</ul>;
};

export default DrugsInfo;

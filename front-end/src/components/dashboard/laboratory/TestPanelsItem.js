import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import {
  fetchLabTestPanelsBySpecificSample,
  updatePhlebotomySamples,
} from "@/redux/service/laboratory";
import ResultPanelRow from "./ResultPanelRow";

const TestPanelsItem = ({ sample, collected, sample_id }) => {
  const auth = useAuth();

  const [resultItems, setResultItems] = useState([]);
  const { labTestPanels } = useSelector(
    (store) => store.laboratory,
  );


  const getTestPanelsBySampleId = async (sample, auth) => {
    try {
      const response = await fetchLabTestPanelsBySpecificSample(sample, auth);
      setResultItems(response);
    } catch (error) {
      console.log("ERROR GETTING PANELS");
    }
  };

  useEffect(() => {
    if (auth) {
      getTestPanelsBySampleId(sample, auth);
    }
  }, [sample]);

  const panels = resultItems.map((item) => {
    const foundPanel = labTestPanels.find(
      (panel) => panel.id === item.test_panel,
    );
    if (foundPanel) {
      return (
        <ResultPanelRow key={`${foundPanel.id}_panel`} item={item} foundPanel={foundPanel} sample_id={sample_id} collected={collected}/>
      );
    }
  });

  return (
    <>
      <ul className="flex gap-3 flex-col px-4">
        <li className="flex justify-between">
          <span className="text-primary w-full">panel name</span>
          <span className="text-primary w-full">select equipment</span>
          <span className="text-primary w-full text-center ">
            action
          </span>
          <span className="text-primary w-5/12"></span>
        </li>
        {panels}
      </ul>
    </>
  );
};

export default TestPanelsItem;
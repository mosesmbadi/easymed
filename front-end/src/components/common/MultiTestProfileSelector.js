import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, Grid } from "@mui/material";
import { fetchLabTestPanelsByProfileId } from "@/redux/service/laboratory";
import { getAllLabTestProfiles, getAllLabTestPanelsByProfile } from "@/redux/features/laboratory";
import { useAuth } from "@/assets/hooks/use-auth";
import { toast } from "react-toastify";

const MultiTestProfileSelector = ({ 
  onSelectionChange, 
  initialSections = null,
  showSummary = true,
  buttonText = "Add Another Test Profile",
  className = ""
}) => {
  const { labTestProfiles } = useSelector((store) => store.laboratory);
  const [testProfileSections, setTestProfileSections] = useState(
    initialSections || [{ id: Date.now(), testProfile: null, selectedPanels: [], panelsData: [] }]
  );
  const auth = useAuth();
  const dispatch = useDispatch();

  // Notify parent component of changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(testProfileSections);
    }
  }, [testProfileSections, onSelectionChange]);

  // Load lab test profiles on mount
  useEffect(() => {
    dispatch(getAllLabTestProfiles(auth));
  }, [auth, dispatch]);

  const addTestProfileSection = () => {
    const newSection = {
      id: Date.now(),
      testProfile: null,
      selectedPanels: [],
      panelsData: []
    };
    setTestProfileSections(prev => [...prev, newSection]);
  };

  const removeTestProfileSection = (sectionId) => {
    if (testProfileSections.length > 1) {
      setTestProfileSections(prev => prev.filter(section => section.id !== sectionId));
    }
  };

  const handleCheckboxChange = (panel, sectionId) => {
    setTestProfileSections((prevSections) => 
      prevSections.map(section => {
        if (section.id === sectionId) {
          const isSelected = section.selectedPanels.find(panelItem => panelItem.id === panel.id);
          return {
            ...section,
            selectedPanels: isSelected
              ? section.selectedPanels.filter(item => item.id !== panel.id)
              : [...section.selectedPanels, panel]
          };
        }
        return section;
      })
    );
  };

  const handleSelectAllChange = (sectionId) => {
    setTestProfileSections((prevSections) =>
      prevSections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            selectedPanels: section.selectedPanels.length === section.panelsData.length
              ? [] // Unselect all if all are currently selected
              : section.panelsData.map(panel => panel) // Select all if not all are currently selected
          };
        }
        return section;
      })
    );
  };

  const getTestPanelsByTheProfileId = async (testProfileId, sectionId) => {
    try {
      const response = await fetchLabTestPanelsByProfileId(testProfileId, auth);
      setTestProfileSections(prevSections => 
        prevSections.map(section => {
          if (section.id === sectionId) {
            return {
              ...section,
              panelsData: response,
              selectedPanels: response // Auto-select all panels by default
            };
          }
          return section;
        })
      );
    } catch (error) {
      console.error('Error fetching test panels:', error);
    }
  };

  const handleTestProfileChange = (testProfileId, sectionId) => {
    // Check if this test profile is already selected in another section
    const isDuplicate = testProfileSections.some(
      section => section.id !== sectionId && section.testProfile === testProfileId
    );
    
    if (isDuplicate && testProfileId) {
      // Find the name of the duplicate profile for a more informative message
      const profileName = labTestProfiles.find(profile => profile.id === parseInt(testProfileId))?.name || 'This profile';
      toast.warning(`${profileName} is already selected. Please choose a different profile.`);
      return; // Prevent adding duplicate profile
    }
    
    setTestProfileSections(prevSections => 
      prevSections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            testProfile: testProfileId,
            selectedPanels: [],
            panelsData: []
          };
        }
        return section;
      })
    );

    if (testProfileId) {
      getTestPanelsByTheProfileId(testProfileId, sectionId);
      dispatch(getAllLabTestPanelsByProfile(testProfileId, auth));
    }
  };

  const resetSections = () => {
    setTestProfileSections([{ id: Date.now(), testProfile: null, selectedPanels: [], panelsData: [] }]);
  };



  return (
    <div className={`space-y-3 ${className}`}>
      {/* Render Multiple Test Profile Sections */}
      {testProfileSections.map((section, sectionIndex) => (
        <div key={section.id} className="border border-gray-300 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Test Profile {sectionIndex + 1}</h3>
            {testProfileSections.length > 1 && (
              <button
                type="button"
                onClick={() => removeTestProfileSection(section.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            )}
          </div>
          
          <div className="mb-3">
            <select
              className="block text-sm pr-9 border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
              onChange={(e) => handleTestProfileChange(e.target.value, section.id)}
              value={section.testProfile || ""}
            >
              <option value="">Select Test Profile</option>
              {labTestProfiles.map((test, index) => (
                <option key={index} value={test.id}>
                  {test?.name}
                </option>
              ))}
            </select>
          </div>

          {section.testProfile && section.panelsData.length > 0 && (
            <div>
              <label className="text-sm font-medium">Select Panels</label>
              <div className="flex items-center mb-2">
                <Checkbox
                  checked={section.selectedPanels.length === section.panelsData.length}
                  onChange={() => handleSelectAllChange(section.id)}
                  size="small"
                />
                <span className="text-sm">
                  {section.selectedPanels.length === section.panelsData.length ? "unselect all" : "select all"}
                </span>
              </div>
              <Grid container spacing={2}>
                {section.panelsData.map((panel) => (
                  <Grid className="flex items-center" key={panel.id} item xs={4}>
                    <Checkbox
                      checked={section.selectedPanels.some((panelItem) => panelItem.id === panel.id)}
                      onChange={() => handleCheckboxChange(panel, section.id)}
                      size="small"
                    />
                    <span className="text-sm">{panel.name}</span>
                  </Grid>
                ))}
              </Grid>
            </div>
          )}
        </div>
      ))}

      {/* Add Another Test Profile Button */}
      <div className="w-full py-4 border-t border-gray-200">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={addTestProfileSection}
            className="bg-[#02273D] hover:bg-[#01202F] text-white px-8 py-4 rounded-xl text-base font-medium flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <span className="text-xl font-bold">+</span>
            <span>{buttonText}</span>
          </button>
        </div>
      </div>

      {/* Summary Section */}
      {showSummary && (
        <div className="bg-gray-50 p-3 rounded-lg border">
          <h4 className="font-semibold text-sm mb-2">Selection Summary:</h4>
          <div className="text-sm text-gray-600">
            <p>Total Test Profile Sections: {testProfileSections.length}</p>
            <p>Test Profiles Selected: {testProfileSections.filter(s => s.testProfile).length}</p>
            <p>Total Panels Selected: {testProfileSections.reduce((total, section) => total + section.selectedPanels.length, 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTestProfileSelector;
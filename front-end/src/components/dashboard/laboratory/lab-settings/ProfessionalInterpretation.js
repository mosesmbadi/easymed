import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import { Grid, Checkbox, FormControlLabel } from "@mui/material";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";

import { useAuth } from "@/assets/hooks/use-auth";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";
import { Column, Pager, Paging, Scrolling } from "devextreme-react/data-grid";
import { BiEdit, BiTrash } from "react-icons/bi";
import SeachableSelect from "@/components/select/Searchable";
import {
  addLabTestInterpretationToStore,
  getAllLabTestPanels,
  getLabTestInterpretations,
  deleteLabTestInterpretationFromStoreAction
} from "@/redux/features/laboratory";
import { createLabTestInterpretation, deleteLabTestInterpretation } from "@/redux/service/laboratory";
import EditProfessionalInterpretationModal from "./modals/professional-interpretation/EditProfessionalInterpretation";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, "all"];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Edit Item",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
    {
      action: "delete",
      label: "Delete Item",
      icon: <BiTrash className="text-warning text-xl mx-2" />,
    },
  ];

  return actions;
};

const sexOptions = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "B", label: "Both" },
];

const rangeTypeOptions = [
  { value: "critical_low", label: "Critical Low" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical_high", label: "Critical High" },
];

const ProfessionalInterpretation = () => {
  const auth = useAuth();
  const userActions = getActions();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const { labTestInterpretations, labTestPanels } = useSelector((store) => store.laboratory);
  const [selectedRowData, setSelectedRowData] = useState({});

  const initialValues = {
    lab_test_panel: "",
    range_type: "",
    sex: sexOptions.find(o => o.value === "B"),
    age_min: "",
    age_max: "",
    value_min: "",
    value_max: "",
    interpretation: "",
    clinical_action: "",
    requires_immediate_attention: false,
  };

  const validationSchema = Yup.object().shape({
    lab_test_panel: Yup.object().required("Field is required!"),
    range_type: Yup.object().required("Field is required!"),
    sex: Yup.object().required("Field is required!"),
    age_min: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Age min must be a number"),
    age_max: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Age max must be a number"),
    value_min: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Must be a number"),
    value_max: Yup.number()
      .nullable()
      .transform((value, originalValue) => (originalValue === "" ? null : value))
      .typeError("Must be a number"),
    interpretation: Yup.string().required("Interpretation text is required!"),
    clinical_action: Yup.string(),
    requires_immediate_attention: Yup.boolean()
  });

  const addNewInterpretation = async (values, helpers) => {
    setLoading(true);
    try {
      const payload = {
        lab_test_panel: values.lab_test_panel.value,
        range_type: values.range_type.value,
        sex: values.sex.value,
        age_min: values.age_min === "" ? null : Number(values.age_min),
        age_max: values.age_max === "" ? null : Number(values.age_max),
        value_min: values.value_min === "" ? null : Number(values.value_min),
        value_max: values.value_max === "" ? null : Number(values.value_max),
        interpretation: values.interpretation,
        clinical_action: values.clinical_action,
        requires_immediate_attention: values.requires_immediate_attention
      };
      const response = await createLabTestInterpretation(payload, auth);
      dispatch(addLabTestInterpretationToStore(response));
      setLoading(false);
      helpers.resetForm();
      toast.success("Interpretation created successfully");
    } catch (error) {
      setLoading(false);
      toast.error("Error creating interpretation");
      console.log("ERR", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this interpretation?")) {
      try {
        await deleteLabTestInterpretation(id, auth);
        dispatch(deleteLabTestInterpretationFromStoreAction(id));
        toast.success("Interpretation deleted successfully");
      } catch (error) {
        toast.error("Error deleting interpretation");
      }
    }
  }

  useEffect(() => {
    dispatch(getLabTestInterpretations(auth));
    dispatch(getAllLabTestPanels(auth));
  }, []);

  const onMenuClick = async (menu, data) => {
    if (menu.action === "update") {
      setSelectedRowData(data);
      setEditOpen(true);
    } else if (menu.action === "delete") {
      handleDelete(data.id);
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={<LuMoreHorizontal className="cursor-pointer text-xl" />}
        />
      </>
    );
  };

  // Enhance data with panel names for the grid
  const gridData = (labTestInterpretations || []).map(item => {
    const panel = labTestPanels.find(p => parseInt(p.id) === parseInt(item.lab_test_panel));
    return {
      ...item,
      lab_test_panel_name: panel ? panel.name : "Unknown Panel",
    };
  });

  return (
    <div>
      <h2 className="my-10 font-bold text-xl">Add Professional Interpretation</h2>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={addNewInterpretation}
      >
        {({ values, setFieldValue }) => (
          <Form>
            <Grid container spacing={2}>
              <Grid item md={6} xs={12}>
                <SeachableSelect
                  label="Test Panel"
                  name="lab_test_panel"
                  options={labTestPanels.map((panel) => ({
                    value: panel.id,
                    label: `${panel?.name} - (${panel?.unit})`,
                  }))}
                />
                <ErrorMessage name="lab_test_panel" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={12}>
                <SeachableSelect
                  label="Range Type"
                  name="range_type"
                  options={rangeTypeOptions}
                />
                <ErrorMessage name="range_type" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={12}>
                <SeachableSelect
                  label="Sex"
                  name="sex"
                  options={sexOptions}
                />
                <ErrorMessage name="sex" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={6}>
                <Field
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  type="number"
                  placeholder="Age Min"
                  name="age_min"
                />
                <ErrorMessage name="age_min" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={6}>
                <Field
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  type="number"
                  placeholder="Age Max"
                  name="age_max"
                />
                <ErrorMessage name="age_max" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={6}>
                <Field
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  type="number"
                  step="0.01"
                  placeholder="Value Min"
                  name="value_min"
                />
                <ErrorMessage name="value_min" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={3} xs={6}>
                <Field
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  type="number"
                  step="0.01"
                  placeholder="Value Max"
                  name="value_max"
                />
                <ErrorMessage name="value_max" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={6} xs={12}>
                <Field
                  as="textarea"
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  rows={2}
                  placeholder="Clinical Interpretation Text"
                  name="interpretation"
                />
                <ErrorMessage name="interpretation" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={6} xs={12}>
                <Field
                  as="textarea"
                  className="block border border-gray py-3 px-4 focus:outline-none w-full"
                  rows={2}
                  placeholder="Suggested Clinical Action"
                  name="clinical_action"
                />
                <ErrorMessage name="clinical_action" component="div" className="text-warning text-xs" />
              </Grid>
              <Grid item md={12} xs={12} className="flex items-center justify-between">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.requires_immediate_attention}
                      onChange={(e) => setFieldValue("requires_immediate_attention", e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Requires Immediate Attention"
                />

                <button type="submit" className="bg-primary px-4 py-2 text-white">
                  {loading && (
                    <svg
                      aria-hidden="true"
                      role="status"
                      className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="#1C64F2"
                      ></path>
                    </svg>
                  )}
                  Add Interpretation
                </button>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
      <div className="my-10">
        <DataGrid
          dataSource={gridData}
          allowColumnReordering={true}
          rowAlternationEnabled={true}
          showBorders={true}
          remoteOperations={true}
          showColumnLines={true}
          showRowLines={true}
          wordWrapEnabled={true}
          allowPaging={true}
          className="shadow-xl"
        >
          <Scrolling rowRenderingMode="virtual"></Scrolling>
          <Paging defaultPageSize={10} />
          <Pager
            visible={true}
            allowedPageSizes={allowedPageSizes}
            showPageSizeSelector={showPageSizeSelector}
            showInfo={showInfo}
            showNavigationButtons={showNavButtons}
          />
          <Column dataField="lab_test_panel_name" caption="Test Panel" />
          <Column dataField="range_type" caption="Type" />
          <Column dataField="sex" caption="Sex" />
          <Column dataField="value_min" caption="Val Min" />
          <Column dataField="value_max" caption="Val Max" />
          <Column dataField="interpretation" caption="Interpretation" />
          <Column dataField="" caption="" width={50} cellRender={actionsFunc} />
        </DataGrid>
        <EditProfessionalInterpretationModal
          open={editOpen}
          setOpen={setEditOpen}
          selectedRowData={selectedRowData}
        />
      </div>
    </div>
  );
};

export default ProfessionalInterpretation;
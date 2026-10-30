import React, { useCallback, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import dynamic from "next/dynamic";
import {
  Column,
  Pager,
  Selection,
} from 'devextreme-react/data-grid';
import CheckBox from 'devextreme-react/check-box';
import themes from 'devextreme/ui/themes';
import { Grid } from "@mui/material";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { updatePrescriptionStatus } from "@/redux/features/pharmacy";
import { updatePrescription } from "@/redux/service/pharmacy";
import { updateAttendanceProcesses, updatePrescribeDrug } from "@/redux/service/patients";
import { FaCheck, FaTimes } from 'react-icons/fa';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

/**
 * What the selected drugs need handed over with them.
 *
 * An injectable is not dispensable on its own -- billing refuses the line when
 * the syringe is not on the shelf -- so the pharmacist has to see the
 * shortfall here, before selecting Dispense, not as a failure afterwards.
 * Requirements are summed across the selection, since two injections drawn at
 * once need two syringes.
 */
const ConsumablesPanel = ({ drugs }) => {
  const totals = new Map();

  drugs.forEach((drug) => {
    (drug.consumables ?? []).forEach((row) => {
      const existing = totals.get(row.consumable);
      if (existing) {
        existing.required_quantity += row.required_quantity;
        existing.is_required = existing.is_required || row.is_required;
      } else {
        totals.set(row.consumable, { ...row });
      }
    });
  });

  if (drugs.length === 0) return null;

  const rows = [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return (
      <div className="border border-gray rounded-md p-3 mb-3 text-sm">
        <span className="font-semibold">Consumables needed: </span>
        <span>None &mdash; nothing is dispensed alongside the selected drugs.</span>
      </div>
    );
  }

  const blocked = rows.filter((row) => row.is_required && row.required_quantity > row.available_quantity);

  return (
    <div className="border border-gray rounded-md p-3 mb-3 text-sm">
      <p className="font-semibold mb-1">Consumables needed (accompaniments)</p>
      <ul className="list-disc pl-5">
        {rows.map((row) => {
          const short = row.required_quantity > row.available_quantity;
          return (
            <li
              key={row.consumable}
              className={short && row.is_required ? "text-warning font-semibold" : ""}
            >
              {`${row.required_quantity} ${row.units_of_measure} of ${row.name}`}
              {!row.is_required && " (optional)"}
              {short && ` — only ${row.available_quantity} in stock`}
            </li>
          );
        })}
      </ul>
      {blocked.length > 0 && (
        <p className="text-warning mt-2">
          These cannot be billed until the missing consumables are received into
          inventory.
        </p>
      )}
    </div>
  );
};

const ViewPrescribedDrugsModal = ({ setOpen, open, selectedRowData }) => {
  const [loading, setLoading] = useState(false);
  const [areBilled, setAreBilled] = useState(false)
  const dispatch = useDispatch();
  const { prescriptionsPrescribed, prescriptions } = useSelector((store) => store.prescription);
  const { doctors } = useSelector((store) => store.doctor);
  const { patients } = useSelector((store) => store.patient);
  const auth = useAuth();
  const doc = doctors.find( doc => doc.id === selectedRowData.doctor);
  const patient = patients.find (patient => patient.id === selectedRowData.patient)
  const prescription = prescriptions.find((prescription)=> prescription.id === selectedRowData.prescription)
  const [allMode, setAllMode] = useState('allPages');
  const [selectedItems, setSelectedItems] = useState([]);
  const [checkBoxesMode, setCheckBoxesMode] = useState(
    themes.current().startsWith('material') ? 'always' : 'onClick',
  );

  const handleSelectionChanged = (selectedRowKeys) => {
    console.log("HADI KWENYE DAMU UPPP", selectedRowKeys)
    const checkAllBilled = selectedRowKeys?.selectedRowsData?.filter((drug)=> drug.is_billed === false)
    console.log("HADI KWENYE DAMU", checkAllBilled)

    if(checkAllBilled.length > 0){
      setAreBilled(false)
    }else(
      setAreBilled(true)
    )

    setSelectedItems(selectedRowKeys);
  };
  console.log("CHECKED THE FOLLOWING ITEMS", selectedItems)

  const handleClose = () => {
    setOpen(false);
  };

  const calculateQuantity = (drug) => {
    const frequency = parseInt(drug.frequency)
    const dosage = parseInt(drug.dosage)
    const duration = parseInt(drug.duration)

    return frequency * dosage * duration
  }

  const handleDispense = async () => {
    try {
      setLoading(true);
      selectedItems.selectedRowsData.forEach(async(drug)=> {
        const payload = {
          id: drug.id,
          is_dispensed:true,
          quantity: calculateQuantity(drug)
        }
        console.log(payload)
        await updatePrescribeDrug( payload, auth).then(() => {

          setLoading(true);
          // updateAttendanceProcesses({ pharmacist: auth.user_id }, payload.id, auth)
          toast.success("successfully updated status")
          setOpen(false);
          setLoading(false);
          handleClose();
      });

      })
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  const renderDispensedCell = (cellData) => {
    return (
      <div style={{ textAlign: 'center' }}>
        {cellData.value ? (
          <FaCheck style={{ color: 'green', fontSize: '1.2em' }} />
        ) : (
          <FaTimes style={{ color: 'red', fontSize: '1.2em' }} />
        )}
      </div>
    );
  };

  const calculateQuantityToDispense = (cellData)=> {
    console.log(cellData)
    const frequency = parseInt(cellData.values[3])
    const dosage = parseInt(cellData.values[2])
    const duration = parseInt(cellData.values[5])

    return frequency * dosage * duration
  }


  return (
    <section>

      <Dialog
        fullWidth
        maxWidth="md"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
        <Grid className="flex justify-between py-4 mb-2">
        <Grid item xs={4}>
          <div>
            <h6 className="text-primary text-xl uppercase">{doc?.role}</h6>
            <p>{`${doc?.first_name} ${doc?.last_name}`}</p>
            <p>{doc?.profession}</p>
          </div>
        </Grid>

        <Grid item xs={4}>
          <div>
            <p className="text-primary text-xl uppercase">patient</p>
            <p>{`${patient?.first_name} ${patient?.second_name}`}</p>
          </div>
        </Grid>

        <Grid item xs={4}>
          <div>
            <p className="text-primary text-xl uppercase">created</p>
            <p>{prescription.start_date}</p>
            <p className={`${prescription.status}` === 'pending' ? "text-warning" : "text-success"} >{prescription.status}</p>            
          </div>
        </Grid>

      </Grid>
        <ConsumablesPanel drugs={selectedItems?.selectedRowsData ?? []} />
        <DataGrid
        dataSource={prescriptionsPrescribed}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={false}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        rowHeight={4}
        minHeight={"70vh"}
        onSelectionChanged={handleSelectionChanged}
      >
        <Selection
          mode="multiple"
          selectAllMode={allMode}
          showCheckBoxesMode={checkBoxesMode}
        />
        <Pager
          visible={false}
          // allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={true}
          showNavigationButtons={true}
        />
        <Column 
          dataField="item_name" 
          caption="Medicine Name" 
        />
        <Column 
          dataField="dosage" 
          caption="Dosage" 
        />
        <Column 
          dataField="frequency" 
          caption="Frequency"
        />
        <Column 
          dataField="quantity" 
          caption="Quantity"
          cellRender={calculateQuantityToDispense}
        />
        <Column 
          dataField="duration" 
          caption="Duration"     
        />
        <Column 
          dataField="note"
          caption="Note"
        />
        <Column 
          dataField="is_dispensed"
          caption="Dispensed"
          cellRender={renderDispensedCell}
        />
      </DataGrid>

      <div>
        <div className="flex justify-end gap-4 mt-8">
        <button
            onClick={handleClose}
            className="border border-warning rounded-xl text-sm px-4 py-2 text-[#02273D]"
          >
            Cancel
          </button>
          <button
            onClick={handleDispense}
            className="bg-primary rounded-xl text-sm px-4 py-2 text-white"
            disabled={`${prescription.status}` === 'dispensed' || !areBilled || selectedItems?.selectedRowsData?.length === 0}
          >
            {loading && (
              <svg
                aria-hidden="true"
                role="status"
                class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
            {areBilled ? (selectedItems?.selectedRowsData?.length > 0 ? "Dispense" : "Select Drug") : (selectedItems?.selectedRowsData?.length > 0 ? "Not Paid" : "Select Drug")}
          </button>
        </div>
      </div>

        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ViewPrescribedDrugsModal;

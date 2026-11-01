import React, { useEffect, useState } from 'react'
import { useRouter } from "next/router";
import { useSelector } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import { fetchLabTestPanelsByTestRequestId, updateLabRequestPanels } from '@/redux/service/laboratory';
import RejectResultDialog from './RejectResultDialog';

const TestResultsPanels = ({ test }) => {
  const auth = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resultItems, setResultItems] = useState([])
  const [rejecting, setRejecting] = useState(null)
  const currentPath = router.pathname;
  const { labTestPanels } = useSelector((store) => store.laboratory);

  const current_interface = currentPath.includes('doctor-desk' || "admit/patients") ? 'doctor' : 'lab'

  const getTestPanelsByTestReq = async (test, auth) => {
    try {
      const response = await fetchLabTestPanelsByTestRequestId(test, auth)
      setResultItems(response)
    } catch (error) {
      console.log("ERROR GETTING PANELS")
    }
  }

  useEffect(() => {
    if (auth) {
      getTestPanelsByTestReq(test, auth)
    }
  }, [test])

  function checkRange(ref_value_low, ref_value_high, result, critical_low, critical_high) {
    if (ref_value_low == null || ref_value_high == null || result == null || result === "") return "";

    // Some labs return qualitative limits (e.g. "Negative", etc). If it's not numbers, skip calculation.
    const res = parseFloat(result);
    const low = parseFloat(ref_value_low);
    const high = parseFloat(ref_value_high);
    const cLow = critical_low != null ? parseFloat(critical_low) : null;
    const cHigh = critical_high != null ? parseFloat(critical_high) : null;

    if (isNaN(res) || isNaN(low) || isNaN(high)) {
      return ""; // Cannot numerically compare
    }

    if (cLow !== null && !isNaN(cLow) && res < cLow) {
      return "Critical Low";
    } else if (cHigh !== null && !isNaN(cHigh) && res > cHigh) {
      return "Critical High";
    } else if (res < low) {
      return "Low";
    } else if (res > high) {
      return "High";
    } else {
      return "Normal";
    }
  }

  const updateApprovedState = (updatedPanel) => {
    setResultItems(prevItems => prevItems.map(panel =>
      panel.id === updatedPanel.id ? { ...panel, result_approved: updatedPanel.result_approved } : panel
    ));
  }

  // The rejected value is cleared from the test, which waits for a new one.
  const markRejected = (panelId, rejection) => {
    setResultItems(prevItems => prevItems.map(panel =>
      panel.id === panelId
        ? { ...panel, result: null, result_approved: false, auto_interpretation: null, clinical_action: null, requires_attention: false, last_rejection: rejection }
        : panel
    ));
  }

  const approveLabResults = async (test_panel) => {
    if (test_panel.result_approved) return

    const payload = {
      id: test_panel.id,
      result_approved: true
    }

    try {
      setLoading(true)
      const response = await updateLabRequestPanels(payload, auth)
      updateApprovedState(response)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.log("FAILED APPROVAL", error)
    }

  }


  const panels = resultItems.map((item) => {
    const foundPanel = labTestPanels.find((panel) => panel.id === item.test_panel)
    if (foundPanel && current_interface === 'lab') {
      const refLow = item.reference_values?.low ?? foundPanel.ref_value_low;
      const refHigh = item.reference_values?.high ?? foundPanel.ref_value_high;
      const critLow = item.reference_values?.critical_low;
      const critHigh = item.reference_values?.critical_high;

      const flag = checkRange(refLow, refHigh, item.result, critLow, critHigh);

      const flagColor = (flag === 'Critical High' || flag === 'Critical Low') ? 'text-error font-bold' :
        (flag === 'High' || flag === 'Low') ? 'text-warning' : 'text-success';

      return (
        <div key={`${foundPanel.id}_panel`} className='mb-4'>
          <li className='flex justify-between items-center'>
            <span className='w-full py-2'>{foundPanel.name}</span>
            <span className='w-full text-center py-2'>{item.result}</span>
            <span className={`w-full text-center py-2 ${flagColor}`}>{flag}</span>
            <span className='w-full text-center py-2'>{refLow}</span>
            <span className='w-full text-center py-2'>{refHigh}</span>
            <span className='w-full text-center py-2'>{foundPanel.unit}</span>
            {current_interface === 'lab' && (
              <div className='w-full text-center py-2 flex justify-end' >
                {item.result && item.result_approved && (
                  <button type="button" disabled className="bg-success text-white px-3 py-2 text-xs rounded-xl cursor-default">Approved</button>
                )}
                {item.result && !item.result_approved && (
                  <div className='flex gap-2'>
                    <button type="button" disabled={loading} className="bg-primary text-white px-3 py-2 text-xs rounded-xl disabled:opacity-50" onClick={() => approveLabResults(item)}>Approve</button>
                    <button type="button" disabled={loading} className="border border-warning text-warning px-3 py-2 text-xs rounded-xl disabled:opacity-50" onClick={() => setRejecting({ panel: item, name: foundPanel.name })}>Reject</button>
                  </div>
                )}
              </div>)}
          </li>
          {/* Sent back at review and waiting for a new result */}
          {!item.result && item.last_rejection && (
            <div className='mt-1 p-2 rounded bg-yellow-50 border-l-4 border-yellow-500 text-xs text-gray-700'>
              {item.last_rejection.action === 'recollect'
                ? `Rejected (${item.last_rejection.reason_display}). Recollect: new sample ${item.last_rejection.replacement_sample_code} is waiting for collection.`
                : `Rejected (${item.last_rejection.reason_display}). Rerun on the same sample.`}
              {` Previous result: ${item.last_rejection.result}.`}
              {item.last_rejection.note && <span className='italic'>{` ${item.last_rejection.note}`}</span>}
            </div>
          )}
          {/* Display interpretation if available */}
          {item.auto_interpretation && (
            <div className={`mt-2 p-3 rounded ${item.requires_attention ? 'bg-red-50 border-l-4 border-red-500' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
              {item.requires_attention && (
                <span className="inline-block bg-red-500 text-white px-2 py-1 text-xs rounded mb-2">⚠ URGENT</span>
              )}
              <div className="text-sm">
                <p className="font-semibold text-gray-700 mb-1">Interpretation:</p>
                <p className="text-gray-600 mb-2">{item.auto_interpretation}</p>
                {item.clinical_action && (
                  <>
                    <p className="font-semibold text-gray-700 mb-1">Recommended Action:</p>
                    <p className="text-gray-600 italic">{item.clinical_action}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )
    } else if (foundPanel && current_interface === 'doctor') {
      const refLow = item.reference_values?.low ?? foundPanel.ref_value_low;
      const refHigh = item.reference_values?.high ?? foundPanel.ref_value_high;
      const critLow = item.reference_values?.critical_low;
      const critHigh = item.reference_values?.critical_high;

      const flag = checkRange(refLow, refHigh, item.result, critLow, critHigh);

      const flagColor = (flag === 'Critical High' || flag === 'Critical Low') ? 'text-error font-bold' :
        (flag === 'High' || flag === 'Low') ? 'text-warning' : 'text-success';

      return (
        <div key={`${foundPanel.id}_panel`} className='mb-4'>
          <li className='flex justify-between items-center'>
            <span className='w-full py-2'>{foundPanel.name}</span>
            <span className='w-full text-center py-2'>{item.result_approved ? item.result : ""}</span>
            <span className={`w-full text-center py-2 ${flagColor}`}>{item.result_approved ? flag : ""}</span>
            <span className='w-full text-center py-2'>{refLow}</span>
            <span className='w-full text-center py-2'>{refHigh}</span>
            <span className='w-full text-center py-2'>{foundPanel.unit}</span>
          </li>
          {/* Display interpretation if available for doctor view */}
          {item.result_approved && item.auto_interpretation && (
            <div className={`mt-2 p-3 rounded ${item.requires_attention ? 'bg-red-50 border-l-4 border-red-500' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
              {item.requires_attention && (
                <span className="inline-block bg-red-500 text-white px-2 py-1 text-xs rounded mb-2">⚠ URGENT</span>
              )}
              <div className="text-sm">
                <p className="font-semibold text-gray-700 mb-1">Interpretation:</p>
                <p className="text-gray-600 mb-2">{item.auto_interpretation}</p>
                {item.clinical_action && (
                  <>
                    <p className="font-semibold text-gray-700 mb-1">Recommended Action:</p>
                    <p className="text-gray-600 italic">{item.clinical_action}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }
  })

  return (
    <>
      <ul className='flex gap-3 flex-col px-2'>
        <li className='flex justify-between'>
          <span className='text-primary w-full'>panel name</span>
          <span className='text-primary w-full text-center'>Result</span>
          <span className='text-primary w-full text-center'>flag</span>
          <span className='text-primary w-full text-center'>Ref Val Low</span>
          <span className='text-primary w-full text-center'>Ref Val High</span>
          <span className='text-primary w-full text-center'>unit</span>
          {current_interface === 'lab' && (
            <span className='text-primary w-full text-center'></span>
          )}
        </li>
        {panels}
      </ul>
      {rejecting && (
        <RejectResultDialog
          open
          panel={rejecting.panel}
          panelName={rejecting.name}
          onClose={() => setRejecting(null)}
          onRejected={(rejection) => markRejected(rejecting.panel.id, rejection)}
        />
      )}
    </>
  )
}

export default TestResultsPanels
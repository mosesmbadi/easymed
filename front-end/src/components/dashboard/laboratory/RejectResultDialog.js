import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '@/assets/hooks/use-auth';
import { rejectLabResult } from '@/redux/service/laboratory';

// Matches LabResultRejection.Reason on the backend. A doubtful run is repeated
// on the same sample; a doubtful sample needs a new draw.
const REASON_GROUPS = [
  {
    label: 'The run is in doubt',
    action: 'rerun',
    reasons: [
      ['qc_failure', 'QC failed or out of range'],
      ['instrument', 'Instrument error or flag'],
      ['implausible', 'Implausible or inconsistent result'],
      ['delta', 'Differs sharply from previous result'],
      ['critical', 'Critical value to confirm'],
      ['entry_error', 'Entered wrongly'],
    ],
  },
  {
    label: 'The sample is in doubt',
    action: 'recollect',
    reasons: [
      ['haemolysed', 'Haemolysed'],
      ['clotted', 'Clotted'],
      ['lipaemic', 'Lipaemic'],
      ['insufficient', 'Insufficient volume'],
      ['contaminated', 'Contaminated'],
      ['mislabelled', 'Unlabelled or mislabelled'],
      ['wrong_container', 'Wrong container'],
    ],
  },
  { label: 'Other', action: 'rerun', reasons: [['other', 'Other']] },
];

const NOTE_MAX_LENGTH = 300;

const suggestedAction = (reason) =>
  REASON_GROUPS.find((group) => group.reasons.some(([value]) => value === reason))?.action ?? 'rerun';

const RejectResultDialog = ({ panel, panelName, open, onClose, onRejected }) => {
  const auth = useAuth();
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('rerun');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const chooseReason = (value) => {
    setReason(value);
    setAction(suggestedAction(value));
  };

  const submit = async () => {
    if (!reason) {
      toast.error('Choose a reason');
      return;
    }
    if (reason === 'other' && !note.trim()) {
      toast.error('Say what is wrong with the result');
      return;
    }
    setSaving(true);
    try {
      const rejection = await rejectLabResult(panel.id, { reason, action, note: note.trim() }, auth);
      toast.success(action === 'recollect'
        ? `Result rejected. Collect new sample ${rejection.replacement_sample_code} from Lab Requests.`
        : 'Result rejected. Enter the rerun result in Add Test Result.');
      onRejected(rejection);
      onClose();
    } catch (error) {
      const data = error?.response?.data;
      toast.error((Array.isArray(data) ? data[0] : data?.detail) || 'Could not reject the result');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <p className="text-base font-semibold">{`Reject ${panelName} result`}</p>
        <p className="text-sm text-gray-500">{`Result entered: ${panel.result}`}</p>
      </DialogTitle>
      <DialogContent>
        <div className="flex flex-col gap-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">Reason</span>
            <select
              className="border border-gray rounded-lg px-3 py-2 focus:outline-none"
              value={reason}
              onChange={(e) => chooseReason(e.target.value)}
            >
              <option value="" disabled>Choose a reason</option>
              {REASON_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.reasons.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1">
            <span className="font-semibold">Next step</span>
            <label className="flex items-start gap-2">
              <input type="radio" name="action" checked={action === 'rerun'} onChange={() => setAction('rerun')} />
              <span>
                Rerun on the same sample
                <span className="block text-xs text-gray-500">The test goes back to Add Test Result for a new value.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="action" checked={action === 'recollect'} onChange={() => setAction('recollect')} />
              <span>
                Recollect a new sample
                <span className="block text-xs text-gray-500">A new sample is waiting for collection under the visit in Lab Requests.</span>
              </span>
            </label>
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="font-semibold">{reason === 'other' ? 'Note' : 'Note (optional)'}</span>
            <textarea
              className="border border-gray rounded-lg px-3 py-2 focus:outline-none"
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Level 2 control out of range"
            />
            <span className="text-right text-xs text-gray-500">{`${note.length}/${NOTE_MAX_LENGTH}`}</span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded-xl border border-gray" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-warning text-white disabled:opacity-50"
              onClick={submit}
              disabled={saving}
            >
              {saving ? 'Rejecting...' : 'Reject result'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RejectResultDialog;

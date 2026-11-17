import React from 'react'
import { useSelector } from 'react-redux'

/**
 * Visit queues load only the most recent page of visits from the server. When
 * more matched, say so, so an older visit isn't mistaken for a missing one.
 */
const ProcessesTruncatedNotice = () => {
  const { processes, processesCount } = useSelector((store) => store.patient)

  if (!processesCount || processesCount <= processes.length) return null

  return (
    <p className="text-sm text-gray-600 italic mb-2">
      Showing the {processes.length} most recent of {processesCount} visits. Search to find older ones.
    </p>
  )
}

export default ProcessesTruncatedNotice

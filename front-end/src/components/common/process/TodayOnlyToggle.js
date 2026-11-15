import React from 'react'

/**
 * Queues open on today's visits. Untick to see earlier days too. A search
 * always looks through every day, so an older visit or a returning patient
 * can still be found without unticking this.
 */
const TodayOnlyToggle = ({ todayOnly, setTodayOnly, searching = false }) => (
  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
    <input
      type="checkbox"
      checked={todayOnly}
      onChange={(e) => setTodayOnly(e.target.checked)}
    />
    Today&apos;s visits only
    {todayOnly && searching && <span className="text-gray-500 italic">(searching all dates)</span>}
  </label>
)

/** The `visited_on` to ask the server for: today's, unless off or searching. */
export const visitedOn = (todayOnly, search) => (todayOnly && !search ? 'today' : null)

export default TodayOnlyToggle

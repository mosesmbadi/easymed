import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isToday, isSameDay } from "date-fns";

const CalenderDate = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const getDaysInMonth = () => {
    const startDate = startOfWeek(startOfMonth(currentDate));
    const endDate = endOfWeek(endOfMonth(currentDate));
    const days = [];
    let currentDay = startDate;

    while (currentDay <= endDate) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }

    return days;
  };

  const daysInMonth = getDaysInMonth();

  const handleDateClick = (day) => {
    setSelectedDate(day);
  };

  return (
    <div className="text-center mt-6 bg-white p-4 shadow-xl">
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-gray-400 text-sm">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {daysInMonth.map((day) => (
          <div
            key={day}
            onClick={() => handleDateClick(day)}
            className={`text-xs h-6 w-6 m-1 cursor-pointer ${
              isToday(day) ? "border p-1 bg-primary text-center text-white" : ""
            } ${isSameDay(day, selectedDate) ? "border rounded-full p-1 bg-blue-500 text-center text-success" : ""}`}
          >
            {format(day, "d")}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalenderDate;

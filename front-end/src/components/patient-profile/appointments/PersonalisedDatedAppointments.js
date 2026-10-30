import React from 'react'

const PersonalisedDatedAppointments = ({upcomingAppointments}) => {

  const topAppointments = upcomingAppointments.slice(0,2).map((appointment)=> {

    const timestamp = appointment.appointment_date_time;
    const dateTime = new Date(timestamp);

    // Get the day of the month from the appointment
    const appointmentDayOfMonth = dateTime.getDate();

    // Get the current day of the month
    const currentDayOfMonth = new Date().getDate();

    // Get the numeric day of the week (e.g., 'Tue')    
    const dayOfWeek = dateTime.toLocaleDateString('en-US', { weekday: 'short' });

    // Get the numeric day of the month (e.g., '7')    
    const dayOfMonth = dateTime.getDate();

    // Get the numeric time of the day (e.g., '16:20')    
    const appointmentTime = dateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    return (
      <div key={`top_appointment_${appointment.id}`} className={`flex gap-1  bg-primary rounded-lg p-2 ${appointmentDayOfMonth > currentDayOfMonth ? "bg-white" : "bg-primary text-white" }`}>
        <div className={`w-1/2 flex flex-col items-center rounded-lg justify-center gap-2 ${appointmentDayOfMonth > currentDayOfMonth ? "bg-orange text-white" : "" }`}>
            <p className='text-xxs'>{dayOfWeek}</p>
            <p className='text-2xl'>{dayOfMonth}</p>
        </div>
        <div className='w-1/2 flex flex-col justify-center gap-1'>
            <p className={`${appointment.assigned_doctor ? "text-xl text-center" : "text-center text-warning" } `}>{appointment.assigned_doctor ? appointment.assigned_doctor : "waiting assignment"}</p>
            <p className='text-xxs text-center'>Neural Surgeon</p>
            <div className={`p-1 rounded-lg justify-center items-center flex ${appointmentDayOfMonth > currentDayOfMonth ? "bg-primary text-white" : "bg-white text-primary" }`}><p>{appointmentTime}</p></div>            
        </div>
    </div>
    )
  })
  return (
    <>
      {topAppointments}
    </>    
  )
}

export default PersonalisedDatedAppointments
import React, { useEffect, useState } from 'react';
import { DateCalendar } from '@mui/x-date-pickers-pro';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterDateFns } from '@mui/x-date-pickers-pro/AdapterDateFns';
import { Box, Typography, Paper } from '@mui/material';
import { format, isSameDay } from 'date-fns';

const AppointmentsCalendar = ({ appointments = [] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState(new Set());
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([]);

  useEffect(() => {
    // Create a set of dates that have appointments
    const dates = new Set(
      appointments.map(apt => 
        format(new Date(apt.appointment_date_time), 'yyyy-MM-dd')
      )
    );
    setHighlightedDates(dates);
  }, [appointments]);

  useEffect(() => {
    // Find appointments for the selected date
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateAppointments = appointments.filter(apt => 
      format(new Date(apt.appointment_date_time), 'yyyy-MM-dd') === dateStr
    );
    setSelectedDateAppointments(dateAppointments);
  }, [selectedDate, appointments]);

  const dayOfWeekFormatter = (day) => {
    return day.charAt(0).toUpperCase();
  };

  const isDateHighlighted = (date) => {
    return appointments.some(apt => 
      isSameDay(new Date(apt.appointment_date_time), date)
    );
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateCalendar
            value={selectedDate}
            onChange={setSelectedDate}
            dayOfWeekFormatter={dayOfWeekFormatter}
            slots={{
              day: (props) => {
                const isHighlighted = isDateHighlighted(props.day);
                return (
                  <Box
                    sx={{
                      ...props.sx,
                      bgcolor: isHighlighted ? 'primary.light' : 'inherit',
                      borderRadius: '50%',
                      '&:hover': {
                        bgcolor: isHighlighted ? 'primary.main' : 'inherit',
                      },
                    }}
                  >
                    {props.children}
                  </Box>
                );
              }
            }}
          />
        </LocalizationProvider>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {format(selectedDate, 'MMMM d, yyyy')}
          </Typography>
          
          {selectedDateAppointments.length > 0 ? (
            selectedDateAppointments.map((apt, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography>
                  Time: {format(new Date(apt.appointment_date_time), 'h:mm a')}
                </Typography>
                <Typography>
                  Doctor: {apt.doctor_name || 'Not assigned'}
                </Typography>
                <Typography>
                  Type: {apt.appointment_type || 'General'}
                </Typography>
              </Paper>
            ))
          ) : (
            <Typography color="text.secondary">
              No appointments scheduled for this date
            </Typography>
          )}
        </Box>
      </Box>

      {appointments.length === 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="h6">
            No appointments scheduled yet
          </Typography>
          <Typography color="text.secondary">
            Your booked appointments will appear here
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AppointmentsCalendar;

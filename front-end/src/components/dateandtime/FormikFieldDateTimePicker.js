import React, {useState, useRef} from "react";
import PropTypes from "prop-types";
import { zonedTimeToUtc, utcToZonedTime, toDate } from "date-fns-tz";
import { CalendarIcon, DateField, MobileDateTimePicker, PickersLayoutContentWrapper, PickersLayoutRoot, pickersLayoutClasses, usePickerLayout  } from "@mui/x-date-pickers";
import { InputAdornment, TextField } from "@mui/material";

const isoDateRegExp = /^(\d{1,})-?(\d{2})?-?(\d{2})T?(\d{2})?:?(\d{2})?:?(\d{2})?\.?(\d{3})?(Z|[+-]\d{2}:\d{2})?/;
const timeRegExp = /^(\d{2}):(\d{2}):?(\d{2})?\.?(\d{3})?/;

const getDateForPicker = (str, timezone) => {
  if (isoDateRegExp.test(str)) {
    return timezone ? utcToZonedTime(new Date(str), timezone) : toDate(str);
  } else if (timeRegExp.test(str)) {
    const date = new Date();
    const utcDateISOString = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    ).toISOString();
    return toDate(
      utcDateISOString.substring(0, utcDateISOString.indexOf("T") + 1) + str
    );
  }
  return null;
};

const FormikFieldDateTimePicker = ({
  field,
  form,
  type,
  timezone,
  returnDateOnly,
  ...restProps
}) => {
  const currentError = form.errors[field.name];
  const pickerValue = getDateForPicker(field.value, timezone);
  const [showCalendar, setShowCalendar] = useState(true);

  const handleChange = date => {
    if (date === null) {
      form.setFieldValue(field.name, null, true);
      return;
    }

    let storedValue;
    if (timezone) {
      storedValue = zonedTimeToUtc(date, timezone).toISOString();
      storedValue = returnDateOnly
        ? storedValue.substring(0, storedValue.indexOf("T"))
        : storedValue;
    } else {
      const utcDateIsoString = new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds(),
          date.getMilliseconds()
        )
      ).toISOString();

      if (isoDateRegExp.test(field.value)) {
        storedValue = !returnDateOnly
          ? utcDateIsoString.substring(0, utcDateIsoString.indexOf("Z"))
          : utcDateIsoString.substring(0, utcDateIsoString.indexOf("T"));
      } else {
        storedValue = utcDateIsoString.substring(
          utcDateIsoString.indexOf("T") + 1,
          utcDateIsoString.indexOf("Z")
        );
      }
    }
    form.setFieldValue(field.name, storedValue, true);
  };

  const handleBlur = e => {
    field.onBlur(e);
  };

  function MyCustomLayout(props) {
    const { toolbar, content, actionBar } = usePickerLayout(props);
    return (
      <PickersLayoutRoot
      className={pickersLayoutClasses.root}
      ownerState={props}
      sx={{
        [`.${pickersLayoutClasses.toolbar}`]: {
        color: "white",
        backgroundColor: "#212751",
        "& .MuiTypography-root ": {
          color: "white",
        },
        },
        [`.${pickersLayoutClasses.actionBar}`]: {
        "& .MuiButton-text ": {
          color: "#212751",
        },
        },
        [`.${pickersLayoutClasses.contentWrapper}`]: {
        "& .Mui-selected": {
          backgroundColor: "#212751",
          color: "white",
        },
        "& .Mui-selected:hover": {
          backgroundColor: "#212751",
          color: "white",
        },
        "& .Mui-selected:focus": {
          backgroundColor: "#212751",
          color: "white",
        },
        },
      }}
      >
      {toolbar}
      <PickersLayoutContentWrapper
        className={pickersLayoutClasses.contentWrapper}
      >
        {showCalendar ? (
        content
        ) : (
        <DateField
          value={value}
          autoFocus
          onChange={(e) => {
          setNewDate(e);
          customizedDate.current = e;
          }}
          variant="standard"
          label="Enter date"
          sx={{
          mx: 4,
          mt: 4,
          width: "150px",
          minWidth: "100%",
          "& .MuiInputLabel-root.Mui-focused": { color: "#212751" }, //styles the label
          "& .MuiInput-underline:after": {
            borderBottomColor: "#212751",
          },
          }}
        />
        )}
      </PickersLayoutContentWrapper>
      {actionBar}
      </PickersLayoutRoot>
    );
  }

  return (
    <MobileDateTimePicker
      name={field.name}
      value={pickerValue}
      error={Boolean(currentError)}
      onError={(_, error) => form.setFieldError(field.name, error)}
      onChange={handleChange}
      onBlur={handleBlur}

      sx={{
        width: "100%",
        "& .MuiInputLabel-root.Mui-focused": { color: "#979797" }, 
        "& .MuiOutlinedInput-root": {
         "&:hover > fieldset": { borderColor: "#C7C8CD" },
         borderRadius: "6px",
        },
      }}

      slots={{
        layout: MyCustomLayout,
       }}

      slotProps={{
        textField: {
         InputProps: {
          endAdornment: (
           <InputAdornment
            sx={{
             color: "#979797",
             cursor: "pointer",
            }}
            position="end"
           >
            <CalendarIcon />
           </InputAdornment>
          ),
         },
        },
       }}
      {...restProps}
    />
  );
};

FormikFieldDateTimePicker.propTypes = {
  field: PropTypes.shape().isRequired,
  form: PropTypes.shape().isRequired,
  type: PropTypes.oneOf(["datetime", "date", "time"]),
  timezone: PropTypes.string,
  returnDateOnly: PropTypes.bool
};

FormikFieldDateTimePicker.defaultProps = {
  type: "datetime",
  returnDateOnly: false
};

export default FormikFieldDateTimePicker;
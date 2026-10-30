import React from 'react';
import Select from 'react-select';
import { useField, ErrorMessage } from 'formik';

const SeachableSelect = ({ setSelectedItem=null, label, name, options, ...props }) => {
  const [field, meta, helpers] = useField({ ...props, name: name });
  const { setValue } = helpers;

  const handleChange = (selectedOption) => {
    setValue(selectedOption);
    if(setSelectedItem){
      setSelectedItem(selectedOption)
    }
  };

  return (
    <div>
      <label htmlFor={props.id || name}>{label}</label>
      <Select
        {...field}
        {...props}
        isSearchable
        isClearable
        value={field.value || null}
        onChange={handleChange}
        options={options}
      />
    </div>
  );
};

export default SeachableSelect;
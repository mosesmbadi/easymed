import React from 'react';
import AsyncSelect from 'react-select/async';
import { useField } from 'formik';

/**
 * SeachableSelect for lists too long to load whole: `loadOptions(input)`
 * asks the server for matches as the user types (and for a first page when
 * the menu opens).
 */
const AsyncSearchableSelect = ({ setSelectedItem = null, label, name, loadOptions, ...props }) => {
  const [field, , helpers] = useField({ ...props, name });

  const handleChange = (selectedOption) => {
    helpers.setValue(selectedOption);
    if (setSelectedItem) setSelectedItem(selectedOption);
  };

  return (
    <div>
      <label htmlFor={props.id || name}>{label}</label>
      <AsyncSelect
        {...field}
        {...props}
        cacheOptions
        defaultOptions
        isClearable
        value={field.value || null}
        onChange={handleChange}
        loadOptions={loadOptions}
      />
    </div>
  );
};

export default AsyncSearchableSelect;

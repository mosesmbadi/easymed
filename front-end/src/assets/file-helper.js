export const getAutoCompleteValue = (options, value, field = 'id', intVal = { id: '', name: '' }) => {
    return Array.isArray(options) ? options.find(option => option[field]=== value) ?? null : null;
  };
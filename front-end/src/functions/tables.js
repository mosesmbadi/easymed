/**
 * Sorts an array of objects by id field in descending order (recently created first).
 * @param {Array<Object>} data - Array of objects to be sorted.
 * @returns {Array<Object>} - Sorted array.
 */
export const sortByLatest = (data) => {
    // Create a new array with sorted objects based on date_created field
    const sortedData = [...data].sort((a, b) => b.id - a.id);
    return sortedData;
};
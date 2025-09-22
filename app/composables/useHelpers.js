export const formatDate = (dateObj) => {
  const { day, month, year } = dateObj;
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
};

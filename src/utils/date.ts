/**
 * Formats any date string (YYYY-MM-DD, ISO string, or Date) to standard "dd/mm/yyyy" format.
 */
export function formatDate(dateValue: string | Date | undefined | null): string {
  if (!dateValue) return '';
  
  if (dateValue instanceof Date) {
    const dd = String(dateValue.getDate()).padStart(2, '0');
    const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
    const yyyy = dateValue.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Handle ISO string or YYYY-MM-DD string
  const cleanStr = dateValue.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    // If parts are [YYYY, MM, DD]
    if (parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // If parts are already [DD, MM, YYYY] or similar
    if (parts[2].length === 4) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  }

  // Fallback to standard javascript date formatting
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return dateValue;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

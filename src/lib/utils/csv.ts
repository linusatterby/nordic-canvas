/**
 * CSV utility for exporting data
 * Uses semicolon separator for Swedish Excel compatibility
 */

/**
 * Escapes a value for CSV format
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // If contains semicolon, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Downloads data as a CSV file
 * @param filename - Name of the file (should end with .csv)
 * @param rows - Array of objects to export
 * @param columns - Optional array of column keys to include (defaults to all keys from first row)
 */
export function downloadCsv<T extends object>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[]
): void {
  if (rows.length === 0) return;

  // Determine columns from first row if not specified
  const cols = (columns ?? Object.keys(rows[0])) as (keyof T)[];

  // Build header row
  const header = cols.map((col) => escapeCsvValue(String(col))).join(";");

  // Build data rows
  const dataRows = rows.map((row) =>
    cols.map((col) => escapeCsvValue(row[col])).join(";")
  );

  // Combine with BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csvContent = bom + [header, ...dataRows].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

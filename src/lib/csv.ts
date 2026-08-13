/**
 * Excel on Korean Windows reads a UTF-8 file as the local codepage unless it
 * starts with a byte order mark, which turns Hangul into mojibake. Every export
 * goes out with the BOM so the file opens correctly by double-click.
 */
const BOM = "﻿";

/**
 * A spreadsheet treats a cell starting with one of these as a formula, so text
 * a TA typed into a note could run when an admin opens the export. Such cells
 * get a leading apostrophe, which Excel and Sheets strip while keeping the text
 * inert. Numbers are never touched, so negative amounts stay real numbers the
 * spreadsheet can total.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function cell(value: string | number) {
  if (typeof value === "number") return String(value);

  let text = String(value ?? "");
  if (FORMULA_LEAD.test(text)) text = `'${text}`;

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]) {
  return BOM + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

export function csvResponse(filename: string, rows: (string | number)[][]) {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
      // The file is built from one account's data; never let a shared cache keep it.
      "X-Content-Type-Options": "nosniff",
    },
  });
}

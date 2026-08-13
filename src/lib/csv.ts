/**
 * Excel on Korean Windows reads a UTF-8 file as the local codepage unless it
 * starts with a byte order mark, which turns Hangul into mojibake. Every export
 * goes out with the BOM so the file opens correctly by double-click.
 */
const BOM = "﻿";

function cell(value: string | number) {
  const text = String(value ?? "");
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
    },
  });
}

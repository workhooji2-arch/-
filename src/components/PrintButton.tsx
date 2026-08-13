"use client";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
      인쇄
    </button>
  );
}

"use client";

export default function DeleteButton({
  action,
  id,
  confirmText = "정말 삭제하시겠습니까?",
  label = "삭제",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmText?: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn btn-danger btn-sm">
        {label}
      </button>
    </form>
  );
}

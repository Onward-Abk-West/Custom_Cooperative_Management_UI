import Swal from "sweetalert2";

const base = {
  background: "var(--surface-card)",
  color: "var(--brand-ink)",
  confirmButtonColor: "var(--brand-green)",
  buttonsStyling: true,
  showClass: { popup: "swal2-show" },
  hideClass: { popup: "swal2-hide" },
};

export function showSuccess(title: string, text: string) {
  return Swal.fire({ ...base, icon: "success", title, text, confirmButtonText: "Continue" });
}

export function showError(title: string, text: string) {
  return Swal.fire({ ...base, icon: "error", title, text, confirmButtonText: "Close" });
}

export async function confirmAction(title: string, text: string, confirmButtonText = "Confirm") {
  const result = await Swal.fire({ ...base, icon: "warning", title, text, showCancelButton: true,
    confirmButtonText, cancelButtonText: "Cancel", reverseButtons: true });
  return result.isConfirmed;
}

export const USERNAME_PATTERN = "[a-zA-Z0-9_]{3,20}";
export const MIN_PASSWORD_LENGTH = 8;

const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

export function usernameError(username: string) {
  if (!username) return "아이디를 입력해주세요.";
  if (!usernameRegex.test(username)) {
    return "아이디는 영문, 숫자, 밑줄(_)로 3~20자로 입력해주세요.";
  }
  return null;
}

/**
 * The browser's date/time/number inputs constrain what a person can type, but
 * the form is just an HTTP request and anyone can send whatever they like. The
 * server re-checks shape and range so a hand-made request cannot store a
 * hundred-hour shift, a wage of a billion, or a date the ledger cannot group.
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MAX_WAGE = 1_000_000;
export const MAX_AMOUNT = 100_000_000;

export function isValidDate(value: string) {
  if (!dateRegex.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Rejects impossible days such as 2026-02-31, which the regex alone allows.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string) {
  return timeRegex.test(value);
}

export function amountError(amount: number, max: number, label: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return `${label}을(를) 0보다 큰 숫자로 입력해주세요.`;
  }
  if (amount > max) {
    return `${label}이(가) 너무 큽니다. ${max.toLocaleString("ko-KR")}원 이하로 입력해주세요.`;
  }
  return null;
}

export function passwordError(password: string, confirm?: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "비밀번호가 일치하지 않습니다.";
  }
  return null;
}

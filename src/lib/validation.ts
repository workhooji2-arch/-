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

export function passwordError(password: string, confirm?: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (confirm !== undefined && password !== confirm) {
    return "비밀번호가 일치하지 않습니다.";
  }
  return null;
}

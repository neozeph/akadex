export const MIN_PASSWORD_LENGTH = 8

export function getPasswordLengthMessage() {
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
}

export function validatePasswordLength(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function validatePasswordConfirmation(password: string, confirmPassword: string) {
  return password === confirmPassword
}

const ACCESS_CODE_KEY = 'mj_scooters_access_code'

export function getAccessCode(): string {
  return localStorage.getItem(ACCESS_CODE_KEY) ?? ''
}

export function setAccessCode(code: string) {
  localStorage.setItem(ACCESS_CODE_KEY, code)
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_CODE_KEY)
}

export function isAuthenticated(): boolean {
  return !!getAccessCode()
}

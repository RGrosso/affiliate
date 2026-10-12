export const E2E_PORT = 3100;
export const BASE_URL = `http://localhost:${E2E_PORT}`;

// Test-only credentials for the throwaway e2e database, set during first-run setup
export const ADMIN = { username: "admin", password: "E2e-Test-Pass1!" };

export const ADMIN_STATE = "test/e2e/.auth/admin.json";

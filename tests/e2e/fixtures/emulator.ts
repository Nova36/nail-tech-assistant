/**
 * Firebase Auth emulator helpers for Playwright tests.
 *
 * The emulator exposes a REST API for test harnesses that mirrors a subset
 * of the Identity Toolkit admin endpoints. These helpers cover what the e2e
 * suite needs: state cleanup between tests and oob-code retrieval so email
 * links can be followed without actually sending email.
 *
 * Host/project values must match playwright.config.ts webServer env.
 */

export const EMULATOR_HOST = '127.0.0.1:9099';
export const EMULATOR_PROJECT_ID = 'nail-tech-assistant-e2e';

export async function clearAuthEmulatorAccounts(): Promise<void> {
  const res = await fetch(
    `http://${EMULATOR_HOST}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to clear auth emulator accounts: ${res.status} ${res.statusText}`
    );
  }
}

export interface OobCodeEntry {
  email: string;
  oobCode: string;
  oobLink: string;
  requestType: string;
}

export async function listOobCodes(): Promise<OobCodeEntry[]> {
  const res = await fetch(
    `http://${EMULATOR_HOST}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/oobCodes`
  );
  if (!res.ok) {
    throw new Error(
      `Failed to list oob codes: ${res.status} ${res.statusText}`
    );
  }
  const json = (await res.json()) as { oobCodes?: OobCodeEntry[] };
  return json.oobCodes ?? [];
}

export async function getLatestOobLink(email: string): Promise<string> {
  const codes = await listOobCodes();
  const match = codes.reverse().find((c) => c.email === email);
  if (!match) {
    throw new Error(
      `No oob code found for email "${email}" — check that the email was submitted and the emulator captured the send.`
    );
  }
  return match.oobLink;
}

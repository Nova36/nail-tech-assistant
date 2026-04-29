export const tokenInvalidCopy = {
  heading: 'Pinterest needs a fresh token',
  summary:
    'The saved Pinterest connection no longer works. Generate a new access token in the Pinterest developer portal, then save it in Vercel.',
  steps: [
    'Open the Pinterest developer portal and sign in with the account that owns this app.',
    'Go to My apps, open this app, and choose Generate access token.',
    'In Generate access token, keep the existing read access (boards and pins) selected, finish the prompts, and copy the new token.',
    'Open this project in Vercel, go to Settings → Environment Variables, and update PINTEREST_ACCESS_TOKEN with the new value.',
    'Save, then redeploy from the Deployments tab so the new token takes effect.',
  ],
  pinterestPortalUrl: 'https://developers.pinterest.com/apps/',
  vercelEnvLabel: 'Settings → Environment Variables',
} as const;

export const insufficientScopeCopy = {
  heading: 'Pinterest needs broader access',
  summary:
    'The saved token works, but it is missing the read permissions this app needs. Re-issue the token in the Pinterest developer portal with both read scopes selected, then save it in Vercel.',
  steps: [
    'Open the Pinterest developer portal and sign in with the account that owns this app.',
    'Go to My apps, open this app, and choose Generate access token.',
    'In Generate access token, select read access for boards AND read access for pins, then finish the prompts and copy the new token.',
    'Open this project in Vercel, go to Settings → Environment Variables, and replace PINTEREST_ACCESS_TOKEN with the new value.',
    'Save, then redeploy from the Deployments tab so the new permissions take effect.',
  ],
  pinterestPortalUrl: 'https://developers.pinterest.com/apps/',
  vercelEnvLabel: 'Settings → Environment Variables',
} as const;

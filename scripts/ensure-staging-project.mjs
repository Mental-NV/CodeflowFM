import { pathToFileURL } from 'node:url';

const projectName = 'test-codeflowfm';
const productionBranch = 'staging';
const hostname = `${projectName}.pages.dev`;

export async function ensureStagingProject({ accountId, apiToken, fetchImpl = fetch }) {
  if (!accountId || !apiToken) {
    throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in repository Actions secrets.');
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects`;
  const headers = { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' };
  async function request(endpoint, options = {}) {
    const response = await fetchImpl(endpoint, { ...options, headers, signal: AbortSignal.timeout(30_000) });
    const body = await response.json();
    if (!response.ok || !body.success) {
      const error = new Error(`Cloudflare Pages request failed (HTTP ${response.status}). Check token permissions and project settings.`);
      error.status = response.status;
      throw error;
    }
    return body.result;
  }

  let project;
  try {
    project = await request(`${url}/${projectName}`);
  } catch (error) {
    if (error.status !== 404) throw error;
    project = await request(url, {
      method: 'POST',
      body: JSON.stringify({ name: projectName, production_branch: productionBranch }),
    });
  }

  if (project.name !== projectName || project.subdomain !== hostname) {
    throw new Error(`Staging must use exactly ${hostname}; verify hostname availability in Cloudflare.`);
  }
  if (project.production_branch !== productionBranch || project.source) {
    throw new Error(`Use a Direct Upload project with production branch "${productionBranch}" for ${projectName}.`);
  }
  return project;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ensureStagingProject({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  });
  console.log(`Staging project ready: https://${hostname}/`);
}

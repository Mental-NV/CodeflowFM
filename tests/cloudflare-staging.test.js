import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureStagingProject } from '../scripts/ensure-staging-project.mjs';

const project = { name: 'test-codeflowfm', subdomain: 'test-codeflowfm.pages.dev', production_branch: 'staging' };
const credentials = { accountId: 'test-account', apiToken: 'test-token' };
const reply = (status, result) => new Response(JSON.stringify({ success: status === 200, result }), { status });

test('reuses an existing staging project without modifying it', async () => {
  const calls = [];
  const result = await ensureStagingProject({ ...credentials, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return reply(200, project);
  } });
  assert.deepEqual(result, project);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/test-account/pages/projects/test-codeflowfm');
  assert.equal(calls[0].options.method, undefined);
});

test('creates a missing project with staging as its production branch', async () => {
  const calls = [];
  await ensureStagingProject({ ...credentials, fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? reply(404, null) : reply(200, project);
  } });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://api.cloudflare.com/client/v4/accounts/test-account/pages/projects');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: 'test-codeflowfm', production_branch: 'staging' });
});

for (const status of [401, 403, 429, 500]) {
  test(`does not attempt project creation after HTTP ${status}`, async () => {
    let calls = 0;
    await assert.rejects(ensureStagingProject({ ...credentials, fetchImpl: async () => {
      calls++;
      return reply(status, null);
    } }), new RegExp(`HTTP ${status}`));
    assert.equal(calls, 1);
  });
}

for (const overrides of [
  { subdomain: 'test-codeflowfm-123.pages.dev' },
  { name: 'codeflowfm' },
  { production_branch: 'master' },
  { source: { type: 'github' } },
]) {
  test(`rejects an incompatible staging project: ${JSON.stringify(overrides)}`, async () => {
    await assert.rejects(ensureStagingProject({ ...credentials, fetchImpl: async () => reply(200, { ...project, ...overrides }) }));
  });
}

test('fails before making API requests when credentials are missing', async () => {
  for (const missing of [{ accountId: '' }, { apiToken: '' }]) {
    await assert.rejects(ensureStagingProject({ ...credentials, ...missing, fetchImpl: () => assert.fail('must not request') }), /Actions secrets/);
  }
});

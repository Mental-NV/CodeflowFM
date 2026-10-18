# Deploy Codeflow FM to Cloudflare Pages

The workflow in [`.github/workflows/cloudflare-pages.yml`](../.github/workflows/cloudflare-pages.yml) builds the app in GitHub Actions and uploads `dist/` to separate Cloudflare Pages **Direct Upload** projects for production and staging.

| Setting | Value |
| --- | --- |
| Repository | `Mental-NV/CodeflowFM` |
| Production project / branch | `codeflowfm` / `master` |
| Target production URL | `https://codeflowfm.pages.dev/` |
| Staging project / branch | `test-codeflowfm` / `staging` |
| Target staging URL | `https://test-codeflowfm.pages.dev/` |
| Build command | `npm run build` |
| Upload directory | `dist` |
| Node.js in CI | `24` |

This deployment serves only static frontend files on Pages. The MP3s remain at their existing public URLs; do not add the original audio files to `dist/`. Pages limits each asset to 25 MiB, while these MP3s are much larger. This static app needs no paid Workers plan or Pages Functions. Existing audio hosting and GitHub Actions usage have their own limits. See [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## 1. Register the Cloudflare Pages project

Use the CLI for initial creation so the production branch is explicitly set to this repository's `master` branch. These commands work from PowerShell in the repository with Node.js installed:

```powershell
npx wrangler@4 login
npx wrangler@4 pages project create codeflowfm --production-branch=master
```

The first command opens Cloudflare login/authorization in your browser. Select your existing account. If you have several accounts, choose the account that will own Codeflow FM when prompted. The second command creates the empty Pages project; the first GitHub deployment will populate it. No local API token file is required for this step.

In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers & Pages → codeflowfm** and confirm its assigned production domain is exactly **codeflowfm.pages.dev**. If that hostname is already taken, Cloudflare may assign a suffixed hostname; the workflow cannot claim an unavailable hostname. Resolve the name before continuing. Reuse an existing `codeflowfm` project only if it belongs to your account and its production branch is `master`.

Choose a **Pages Direct Upload** project. GitHub Actions will perform the build and deployment, so a separate Cloudflare Git integration and Cloudflare build settings are unnecessary. Direct Upload projects cannot later switch to Cloudflare's built-in Git integration without creating another project. See [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) and the [Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/).

The `pages.dev` address is provided by Cloudflare. You do not need to purchase a domain, add a DNS zone, or configure a custom domain for this target.

## Staging project provisioning

After tests and the build pass on a PR targeting `master`, the **Deploy staging** job runs `scripts/ensure-staging-project.mjs` using the existing repository Cloudflare secrets. It looks up `test-codeflowfm` and creates it if missing, with `staging` as its production branch. It checks that the assigned hostname is exactly `test-codeflowfm.pages.dev`, that the branch is `staging`, and that the project uses Direct Upload. Authentication failures and incompatible existing projects stop the deployment; existing settings are never overwritten.

The staging upload always uses `--project-name=test-codeflowfm --branch=staging`. Matching this project's production branch updates its root address, **https://test-codeflowfm.pages.dev/**. It does not publish to the production app's `codeflowfm` project. No Git branch named `staging` is required: this is Cloudflare deployment metadata for tested PR builds.

Alternatively, create the project before the first PR:

```powershell
npx wrangler@4 pages project create test-codeflowfm --production-branch=staging
```

Both projects must belong to the account in `CLOUDFLARE_ACCOUNT_ID`. If the requested hostname is unavailable, resolve that in Cloudflare; the workflow rejects a suffixed hostname. Staging uses the same public audio sources as production.

## 2. Copy the Cloudflare account ID

In **Workers & Pages**, find **Account Details → Account ID** and copy it. Alternatively, use the dashboard search (`Ctrl+K`) and search for **Copy account ID**. Use the account that owns both Pages projects, not a Zone ID or a project ID. See [Find account and zone IDs](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

## 3. Create the deployment API token

In the Cloudflare dashboard, open **API Tokens**, select **Create Token → Custom Token / Get started**, then configure:

| Field | Value |
| --- | --- |
| Token name | `GitHub Actions - CodeflowFM` |
| Permission | **Account → Cloudflare Pages → Edit** |
| Account resources | Include only the account owning both Pages projects, where the token UI offers an account selector |

Create the token and copy its value into the GitHub secret in the next step. Store the token only in GitHub Secrets, not in source files, frontend configuration, or workflow YAML. A Global API Key is not needed. If you set an expiration, replace the GitHub secret before it expires.

Cloudflare documents this permission and deployment method in [Direct Upload with continuous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## 4. Add GitHub Actions secrets

Open [CodeflowFM's Actions secrets](https://github.com/Mental-NV/CodeflowFM/settings/secrets/actions), or navigate to **Settings → Secrets and variables → Actions → Secrets → New repository secret**. Add both:

| Secret name | Secret value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID from step 2 |
| `CLOUDFLARE_API_TOKEN` | The token value from step 3 |

Use these exact names. Repository secrets are sufficient. The staging job records deployments in the GitHub `staging` environment, which GitHub creates automatically if needed. No environment secrets, repository variables, GitHub personal access token, or secrets inside Cloudflare Pages are required. For automatic deployment, the `staging` environment must permit PR merge refs (`refs/pull/*/merge`) and have no required-reviewer gate. GitHub supplies the workflow's own token automatically. See [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

Under **Settings → Actions → General**, make sure Actions is enabled and your action policy allows `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact`, and `cloudflare/wrangler-action`. The workflow requests only `contents: read`; keep the default GitHub token permissions read-only.

## 5. Commit the workflow and deploy

Commit the new workflow, this guide, and the README change, then push or merge them into `master`. Keep `dist/` ignored: CI builds it from the source. For example, from the repository root:

```powershell
git add .github/workflows/cloudflare-pages.yml scripts/ensure-staging-project.mjs tests/cloudflare-staging.test.js docs/04-cloudflare-pages-deployment.md README.md
git commit -m "Add Cloudflare Pages staging deployment"
git push origin master
```

In [GitHub Actions](https://github.com/Mental-NV/CodeflowFM/actions), open **Cloudflare Pages** and watch **Test and build**, followed by **Deploy production** on `master` or **Deploy staging** on a PR. The first job runs all tests, builds `dist/`, and saves it as a workflow artifact. Deployment jobs require that job to succeed and upload that exact artifact. Any failed test or build stops deployment. No `npm install` is needed for the dependency-free app; the Wrangler action installs its own deployment CLI.

After a successful deployment, open **https://codeflowfm.pages.dev/** and click **Future Garage**. Verify playback, pause/resume, volume/mute, and persistence after reloading. The workflow's run summary includes the production link; the Cloudflare project shows deployment status and history.

To deploy manually after the workflow is on the default branch: **Actions → Cloudflare Pages → Run workflow → Branch: master → Run workflow**. Selecting another branch runs checks but does not publish production.

## Subsequent changes

- **PR opened, reopened, or updated targeting `master`:** run all tests and build, then deploy the tested artifact to staging.
- **Fork or Dependabot PR targeting `master`:** run tests and build only; GitHub does not expose the deployment secrets to these runs. No `pull_request_target` workflow is used.
- **Push or merge to `master`:** test, build, and deploy production.
- **Manual run on `master`:** test, build, and redeploy that branch.
- Production uploads and staging uploads each have their own concurrency group, so uploads to the same project cannot overlap. New PR checks cancel superseded checks for that PR; active uploads finish. GitHub may replace a pending deployment when another arrives.
- All PRs share one staging address, which serves the last completed successful deployment. Each staging run summary also includes its unique deployment URL. Production continues to serve the last successful `master` deployment.

For a rollback, revert the bad commit and push the revert to `master`; the workflow rebuilds and redeploys the reverted source.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing-secrets error | Both values must be repository **Actions secrets**, with the exact names above. |
| Authentication or permission error | Token has **Cloudflare Pages: Edit**, has not expired, and belongs to the account in `CLOUDFLARE_ACCOUNT_ID`. |
| Project not found | Create production `codeflowfm` in the same account as the ID stored in GitHub. Staging is created automatically; its token needs Pages Edit in that account. |
| Deployment appears as a preview | Match the project's production branch to its upload: `master` for `codeflowfm`, `staging` for `test-codeflowfm`. |
| A suffixed `pages.dev` URL was assigned | The requested hostname was unavailable; verify the assigned domain in Cloudflare. |
| No Run workflow button | The workflow must be committed to the repository's default branch, and Actions must be enabled. |
| PR does not deploy staging | Check that it targets `master`, comes from this repository, is not a Dependabot run, and all tests/build passed. Check secrets and GitHub staging environment restrictions. |
| Non-master manual run does not deploy | Expected: manual deployment only publishes production from `master`. |
| Site loads but music does not | Check the public audio URLs and browser network errors; the frontend deployment does not upload or proxy MP3s. |

For an existing Direct Upload project with the wrong production branch, Cloudflare requires an API update; the correction is documented under [Direct Upload production branch configuration](https://developers.cloudflare.com/pages/get-started/direct-upload/#production-branch-configuration). Set it to `master` for production or `staging` for the staging project rather than the `main` value in Cloudflare's example. If you later rename the Git branch, update both the workflow's branch filters/guards/deploy command and the Pages project's production branch together.

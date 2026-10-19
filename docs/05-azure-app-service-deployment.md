# Deploy Codeflow FM to Azure App Service

The **Static web app CD** workflow in [`.github/workflows/cloudflare-pages.yml`](../.github/workflows/cloudflare-pages.yml) deploys the tested `static-app` artifact to Azure App Service after a push/merge to `master`, or a manual run on `master`. Azure and Cloudflare production deployments run independently after the same test/build job. PRs do not deploy to Azure.

The Azure target is a **Windows App Service, publishing Code**, where IIS serves `index.html`, JavaScript, CSS, JSON, and SVG directly. Only `dist/` is uploaded; no application backend, Node server, container, or audio files are deployed. MP3s continue to stream from their existing public URLs. This workflow does not provision Azure resources.

## Required Azure setup

Before the first deployment:

1. Create or select an active Azure subscription, resource group, **Windows App Service plan**, and a dedicated **Windows Web App** with publishing set to **Code**. Use the .NET Framework stack for IIS static hosting; the app itself contains no .NET code. Select a plan tier and region supported by your subscription. Set HTTPS Only, and ensure `index.html` is in **Configuration → Default documents**. Leave Deployment Center's automatic workflow generation disabled because this repository already supplies the pipeline.
2. Create a Microsoft Entra application and service principal (or use an existing deployment identity). Give it **Website Contributor**, scoped to the web app resource below. Creating the identity and assigning the role requires the appropriate Entra and Azure RBAC administrator permissions.

   ```text
   /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Web/sites/<app-service-name>
   ```

3. Add a federated credential to that identity for GitHub Actions, using these exact values (adjust the repository if deploying a fork):

   ```json
   {
     "name": "codeflowfm-azure-production",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:Mental-NV/CodeflowFM:environment:azure-production",
     "audiences": ["api://AzureADTokenExchange"]
   }
   ```

   The subject uses the GitHub **environment**, rather than a branch, because the Azure job declares `azure-production`. No client secret or publish profile is needed. See Microsoft's [App Service GitHub Actions setup](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions) and [Azure Login OIDC instructions](https://github.com/Azure/login#login-with-openid-connect-oidc-recommended).

4. Ensure GitHub-hosted runners can reach the app's SCM/Kudu deployment endpoint. A private endpoint or SCM access restriction may require a runner with access to that network.

Linux App Service needs a static-serving process and a different startup configuration. This workflow checks for Windows and fails before changing settings on a Linux app.

## GitHub placeholders

Under **Settings → Secrets and variables → Actions**, populate these repository settings. The workflow references them directly; do not replace them with literal credentials in YAML.

| Type | Name | Value to supply |
| --- | --- | --- |
| Secret | `AZURE_CLIENT_ID` | `<deployment-identity-client-id>` |
| Secret | `AZURE_TENANT_ID` | `<entra-directory-tenant-id>` |
| Secret | `AZURE_SUBSCRIPTION_ID` | `<azure-subscription-id>` |
| Variable | `AZURE_RESOURCE_GROUP` | `<existing-resource-group-name>` |
| Variable | `AZURE_WEBAPP_NAME` | `<existing-app-service-name>` (resource name, not URL or resource ID) |

Resource names are configuration, so they use Actions variables. The three identity IDs follow Azure Login's secrets convention; authentication uses short-lived OIDC tokens.

Create the GitHub environment **azure-production** under **Settings → Environments** and restrict deployment branches to `master`. Any required reviewers must approve the job before deployment. The action policy must permit `azure/login` and `azure/webapps-deploy` alongside the existing build/artifact actions. Only the Azure deployment job receives `id-token: write`.

## Deploy and verify

Push/merge to `master`, or select **Actions → Static web app CD → Run workflow → master**. The Azure job fails with a named configuration error if any setting is missing. Once authenticated, it verifies the existing target is Windows, disables remote build automation, and enables [running from a ZIP package](https://learn.microsoft.com/en-us/azure/app-service/deploy-run-package) with `SCM_DO_BUILD_DURING_DEPLOYMENT=false` and `WEBSITE_RUN_FROM_PACKAGE=1`. The deploy action packages the contents of `dist/` at the web root. The package is read-only, which is suitable for this static client.

The deployment replaces the selected app's content, so use a dedicated app. Production deployments to Azure are serialized. Cloudflare's existing production and PR staging deployments continue separately; an Azure configuration/deployment failure marks its job and the workflow as failed without preventing the independent Cloudflare job from running.

After success, open the Azure URL in the run summary. Check that the root shows Codeflow FM, `/assets/stations.json` returns JSON, and `/src/app.js` loads as JavaScript. Click a station and verify playback and pause/resume. Revert a bad commit and push to `master` to rebuild and redeploy a previous version.

Actual Azure deployment remains blocked until the resources, OIDC federation/role assignment, GitHub settings, and deployment endpoint access above are in place. These cannot be validated by the local test/build commands.

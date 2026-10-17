# Marketplace deployment adapters

Local and Docker installations can update plugins and themes directly. Read-only deployments should ask a Git
repository to make the same change and let the hosting platform deploy the resulting commit.

Configure the project in `firekylin.config.js`:

```js
module.exports = {
  // database and other settings
  marketplace: {
    deployment: {
      type: 'vercel-git', // use "github" for another GitHub-hosted deployment
      repository: 'owner/site-repository',
      token: process.env.FIREKYLIN_MARKETPLACE_GITHUB_TOKEN,
      eventType: 'firekylin-package-change'
    }
  }
};
```

The token stays on the server and needs permission to dispatch events to the configured repository. The adapter
sends a `repository_dispatch` event containing one validated operation: `plugin.install`, `plugin.uninstall`, or
`theme.install`. A repository workflow should apply that operation on a branch, update `pnpm-lock.yaml`, run the
project checks, and open a pull request. Merging that pull request triggers the normal Vercel Git deployment.

Do not apply the event with an interpolated shell command. Pass `github.event.client_payload` through environment
variables to a script that validates the package name, exact version, HTTPS theme URL, and SHA-512 integrity before
changing files. Protect the deployment environment and require review on the generated pull request.

The Firekylin package includes `firekylin-marketplace-change`, a shell-free receiver that repeats these checks,
updates plugins with pnpm, verifies theme downloads, and installs themes into the repository. A minimal receiver
workflow is:

```yaml
name: Marketplace change
on:
  repository_dispatch:
    types: [firekylin-package-change]
permissions:
  contents: write
  pull-requests: write
jobs:
  change:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: node node_modules/firekylin/bin/marketplace-change.js
        env:
          FIREKYLIN_MARKETPLACE_CHANGE: ${{ toJSON(github.event.client_payload) }}
      - run: pnpm test
      - uses: peter-evans/create-pull-request@v7
        with:
          branch: firekylin/marketplace-${{ github.run_id }}
          title: Apply Firekylin marketplace change
          commit-message: Apply Firekylin marketplace change
```

Pin actions to reviewed commit SHAs in production repositories.

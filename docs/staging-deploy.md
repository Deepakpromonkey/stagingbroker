# Staging deploy

`staging.dollartraq.com` deploys itself. A push to `main` on
`Deepakpromonkey/stagingbroker` builds the app in GitHub Actions, uploads it
to the staging box (3.15.199.243) as `releases/<commit>/`, and
`deploy/staging/release.sh` points `dist` — nginx's root — at it in a single
rename. If the site does not then serve the new build, `dist` goes back to the
previous release and the run fails.

The last three releases are kept. The workflow only runs in this repository.

- **Deploy:** merge to `main`.
- **Roll back / deploy something else:** Actions → Deploy staging → Run
  workflow, with the branch, tag or commit.
- **Build settings:** the `VITE_*` values in the workflow's Build step. They
  are public — Vite writes them into the bundle.

Nothing is built on the server any more, so the checkout in
`/var/www/dollartraq-frontend` is no longer what is served.

The workflow needs the secret `STAGING_SSH_KEY` (Settings → Secrets and
variables → Actions): the private half of a key in `~ubuntu/.ssh/authorized_keys`.

# hosting-dashboard

Customer dashboard for the [WyattAu hosting platform](https://github.com/WyattAu/SimpleInfrastructureStack):
tenant health and backup jobs, backed by
[`hosting-api`](https://github.com/WyattAu/hosting-api).

Astro 7 + SolidJS 1.9 islands. Design tokens derive from
[`pediment`](https://github.com/WyattAu/pediment)'s Spatial Materialism
system (vendored in `src/styles/tokens.css` until pediment publishes to
npm — then this becomes a one-line `@import` swap).

## Security model

```
browser ──► edge proxy (TLS + oauth2-proxy user auth)
                └──► this app (127.0.0.1:4321)
                        /api/* routes ──► hosting-api (127.0.0.1:8484)
                                ▲ HOSTING_API_TOKEN lives HERE only
```

- The browser never sees `HOSTING_API_TOKEN` — server routes inject it.
- User authentication is delegated entirely to the edge proxy.
- The backup-trigger route additionally validates the tenant slug before
  forwarding (defence in depth; hosting-api validates again).

## Development

```bash
bun install
HOSTING_API_URL=http://127.0.0.1:8484 HOSTING_API_TOKEN=dev-token bun run dev
bun run build          # server build (node adapter) into dist/
tsc -p . --noEmit      # typecheck (astro check hangs under bun — tracked)
```

## Deployment

Runs on docker01 next to hosting-api; wired by the `hosting_docker_host`
Ansible role (systemd unit queued for iteration 4). Environment:

| Var | Purpose |
| --- | --- |
| `HOSTING_API_URL` | hosting-api base (default `http://127.0.0.1:8484`) |
| `HOSTING_API_TOKEN` | bearer token, from the SOPS-rendered platform secrets |
| `PORT` / `HOST` | node listener (default `4321`, loopback) |

## License

Apache-2.0

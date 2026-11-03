# Feedback Board

A small team tool for customer feedback: collect requests, tag them, assign an
owner, and publish a weekly digest of what customers asked for.

Feedback Board is the example application behind the
[Symora](https://github.com/halfleaf-ai/symora) example workspace. The open
issues in this repository are real work — bugs, missing tests, a feature
request and stale documentation — that the example team's people and Agents
pick up in public. Fork it and try the same tasks yourself.

## Run it

Requires Node.js 22.13 or later (it uses the built-in `node:sqlite`).

```sh
npm install
npm run seed   # optional: 25 sample feedback items
npm run dev    # API on :8787, web app on http://localhost:5173
```

```sh
npm test           # unit tests
npm run typecheck
npm run build && npm start   # production build served on :8787
```

The database is a single SQLite file, `feedback.db` by default; set
`FEEDBACK_DB` to use another path.

## Layout

| Path | Contents |
| --- | --- |
| `server/` | Hono API, SQLite storage, priority scoring and the weekly digest |
| `web/` | React single-page app built with Vite |
| `docs/` | API reference and architecture notes |
| `symora/` | Script that builds the Symora example workspace for this repository |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

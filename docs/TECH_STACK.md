# Technology Stack

The versions below come from `client/package.json` and `server/package.json`;
lockfiles hold the exact resolved dependency graph. This documents current
dependencies, not a requirement to upgrade them.

| Area | Current implementation |
|---|---|
| Runtime and API | Node.js, Express 5, CommonJS backend |
| UI | React 19, React Router 7, Vite 8, Axios, Tailwind CSS 4 |
| Persistence | MongoDB through Mongoose 9 |
| Authentication | `jsonwebtoken` JWTs, `bcryptjs` password hashes, database-backed role and token-version checks |
| Email | Nodemailer 10, legacy Gmail transport or optional custom SMTP; see `DEPLOYMENT.md` |
| Ticket PDF and QR | PDFKit and `qrcode`; generated in memory by the server |
| Browser QR scanner | `@zxing/browser`; scanning results are verified by the API |
| Testing | Node.js built-in `node:test` for backend and client utility tests |
| Development | npm scripts, Nodemon for server development, Vite proxy to `localhost:5000` |

## Package scripts

Root scripts include `npm run install:all`, `npm run dev`, separate
`dev:client`/`dev:server`, `npm run build`, and `npm run lint`. The server
provides `npm start`, `npm run dev`, and `npm test`. The client provides
`npm run dev`, `npm run build`, `npm run lint`, and `npm run preview`; client
tests are run with `node --test` from `client/` (there is no `test` npm
script).

Deployment examples in `vercel.json` describe the configured multi-service
routes and cron schedule; they do not establish that the project is deployed.
See [`DEPLOYMENT.md`](DEPLOYMENT.md) for configuration and environment
requirements.

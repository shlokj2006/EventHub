# EventHub Client

This folder contains the React 19/Vite frontend. See the root
[`README.md`](../README.md) for local startup, and
[`../docs/ARCHITECTURE_AND_STRUCTURE.md`](../docs/ARCHITECTURE_AND_STRUCTURE.md)
and [`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md) for current client/API
behavior.

In development, Vite proxies `/api` to `http://localhost:5000`. The client
reads the optional `VITE_API_URL` build-time variable; it should be the API
base including `/api` when using a separate backend origin. No frontend
secrets belong in `VITE_*` variables.

```powershell
npm run dev
node --test
npm run build
npm run lint
```

There is no client `test` npm script; utility tests are run with Node's built-
in test runner from this directory. `npm run lint` may report existing issues;
report actual results rather than suppressing them.

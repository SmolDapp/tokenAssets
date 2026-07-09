# Token Assets UI

A web UI to browse the token assets served by this repository. Built with Next.js, adapted from the TokenRegistry UI.

## How it works

The UI is fully static regarding data: a build-time script scans the `tokens/` and `chains/` folders at the repository root and generates a JSON index in `public/data/`:

- `public/data/chains.json`: the list of chains with their token counts
- `public/data/tokens/{chainID}.json`: the tokens of each chain

Token metadata (name, symbol, decimals) is resolved at generation time with the following cascade:

1. [smoldapp/tokenLists](https://github.com/SmolDapp/tokenLists) aggregated lists (`lists/{chainID}.json`)
2. Onchain multicall (`name()`, `symbol()`, `decimals()`) through the chain's public RPC, for EVM tokens missing from the lists
3. Fallback to address-only display

Token images are loaded from the production CDN (`https://assets.smold.app`).

## Default ordering (new first, then by market cap)

Each token carries two ranking signals resolved at build time:

- `addedAt` (epoch seconds) — recency, from one pass over the git history
  (`git log --diff-filter=A ...`), the commit that first added its `logo.svg`.
- `mcap` (USD) — popularity, the token's aggregated market cap from
  [DefiLlama](https://coins.llama.fi) (`POST /mcaps`, keyless, batched, best-effort).

The default (no-search) list order (`rankTokens` in `app/_hooks/useTokens.ts`) is two
deterministic tiers:

1. **Recently added tokens** (added less than a month ago), newest first — each shown with
   a "New" badge. The window is `NEW_TOKEN_WINDOW_SECONDS` in `app/_utils/helpers.ts`.
2. **Everything else by market cap**, biggest first; tokens without a market cap fall to the
   bottom, sorted alphabetically for a stable order.

Search results are ranked by relevance instead. A usage-based popularity signal
(view/download counters) could feed the market-cap tier later without touching the layout.

> **CI caveat:** the recency signal needs the full git history. GitHub Actions and Vercel
> do shallow clones by default — set `fetch-depth: 0` (or `git fetch --unshallow`) before
> running `generate`, otherwise every `addedAt` collapses to the last commit.

## Keeping the data fresh

`mcap` values (and new tokens) go stale, so the index should be regenerated periodically.
The weekly workflow `.github/workflows/ui-refresh.yml` regenerates it every Monday (and on
manual dispatch), and — if the `VERCEL_DEPLOY_HOOK_URL` repo secret is set — triggers a
production redeploy so the live site picks up fresh data. Without that secret it still runs
as a canary that catches DefiLlama/git pipeline breakage. If you host elsewhere, either
point that secret at your own rebuild hook or commit `public/data` from the workflow.

## Development

```bash
yarn install
yarn generate   # builds public/data (also runs automatically before dev/build)
yarn dev
```

`yarn generate` is skipped on `dev` if `public/data` already exists (`--if-missing`). Delete `public/data` to force a refresh.

## Build

```bash
yarn build
yarn start
```

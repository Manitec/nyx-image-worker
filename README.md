# nyx-image-worker

Cloudflare Worker that proxies image generation requests to Replicate's FLUX.1 schnell model for NyxBot.

## Setup

```bash
npm install -g wrangler
npx wrangler login
npx wrangler secret put REPLICATE_API_TOKEN
npx wrangler deploy
```

## Endpoint

`POST https://nyx-image-gen.<your-subdomain>.workers.dev`

```json
{ "prompt": "a cat in space" }
```

Returns raw PNG binary.

## Model

`black-forest-labs/flux-schnell` via Replicate unified predictions API.
`disable_safety_checker: true` — explicit content enabled!

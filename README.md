# Slow Network

Simulates slow network conditions in Insomnia so you can test APIs under poor connectivity.

## The Problem

APIs are usually tested on fast, stable connections. In production, many users face:

- Weak mobile signals (3G, EDGE, 2G)
- Congested networks
- Unstable connections

Without testing under these conditions, you may ship APIs that:

- Time out too early or too late
- Provide poor loading feedback
- Fail in ways you didn't anticipate

## What This Plugin Solves

This plugin **throttles request and response transfers** by sending data in small chunks with configurable delays. You can:

- Test how your API behaves on slow networks
- Tune timeouts and retry logic
- Validate loading states and UX before production

## How It Works

1. **Proxy** – When a request includes the `slow-network` header, the plugin starts a local proxy server.
2. **Interception** – The request is redirected to `localhost` instead of the real URL. The proxy receives it and forwards to the actual target.
3. **Throttling** – Both the request body and response body are sent in chunks of `N` bytes, with `M` ms delay between each chunk.
4. **Cleanup** – After the response finishes, the proxy is stopped.

The format is `chunk|delay` (e.g. `256|200` = 256 bytes per chunk, 200 ms between chunks).

## How to Use

### Option 1: Template Tags (recommended)

Add a header `slow-network` and use a template tag as the value:

1. Create a header: `slow-network`
2. Set the value to `{% slowNetwork3g %}` or another tag
3. Send the request

**Available presets:**

| Tag | Chunk | Delay | Simulates |
|-----|-------|-------|-----------|
| `{% slowNetwork3g %}` | 256 B | 200 ms | 3G |
| `{% slowNetworkEdge %}` | 128 B | 400 ms | EDGE |
| `{% slowNetwork2g %}` | 64 B | 700 ms | 2G |
| `{% slowNetworkCustom chunk delay %}` | custom | custom | Custom |

### Option 2: Manual header value

Set the header `slow-network` to a value in the format `chunk|delay`:

```
slow-network: 256|200
```

- **chunk** – Size of each chunk in bytes (e.g. 256)
- **delay** – Delay between chunks in milliseconds (e.g. 200)

### Example

```
GET https://api.example.com/users
Headers:
  slow-network: 128|400
```

This simulates an EDGE-like connection: 128 bytes per chunk, 400 ms between chunks.

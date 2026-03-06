# slow-network

**Insomnia plugin** that simulates slow network conditions to test APIs under poor connectivity.

## Installation in Insomnia

1. Open **Insomnia**
2. Go to **Application** → **Preferences** (or `Ctrl/Cmd + ,`)
3. Click the **Plugins** tab
4. Click **Install Plugin**
5. Enter `insomnia-plugin-slow-network` and confirm
6. The plugin will be installed and appear in the list

## How to Use in Insomnia

1. Create or open a request
2. In the **Headers** tab, add the `slow-network` header
3. Set the value (see options below) and send the request
4. The response will be delivered in chunks with delay, simulating a slow network

## Configuration Options

### Option 1: Template Tags (recommended)

1. Add the `slow-network` header
2. Set the value to a template tag: `{% slowNetwork3g %}`, `{% slowNetworkEdge %}`, etc.
3. Send the request

**Available presets:**

| Tag                                   | Chunk  | Delay  | Simulates |
| ------------------------------------- | ------ | ------ | --------- |
| `{% slowNetwork3g %}`                 | 256 B  | 200 ms | 3G        |
| `{% slowNetworkEdge %}`               | 128 B  | 400 ms | EDGE      |
| `{% slowNetwork2g %}`                 | 64 B   | 700 ms | 2G        |
| `{% slowNetworkCustom chunk delay %}` | custom | custom | Custom    |

### Option 2: Manual value

Set the `slow-network` header to a value in the format `chunk|delay`:

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
2. **Interception** – The request is redirected to `localhost`. The proxy receives it and forwards to the actual target.
3. **Throttling** – Both the request body and response body are sent in chunks of `N` bytes, with `M` ms delay between each chunk.
4. **Cleanup** – After the response finishes, the proxy is stopped.

The format is `chunk|delay` (e.g. `256|200` = 256 bytes per chunk, 200 ms between chunks).

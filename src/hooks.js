const http = require("http")
const https = require("https")
const net = require("net")
const { URL } = require("url")

function parseSlowNetworkValue(value) {
  if (!value || typeof value !== "string") return null
  const match = value.trim().match(/^(\d+)\s*\|\s*(\d+)$/)
  if (match) {
    return { chunk: parseInt(match[1], 10), delay: parseInt(match[2], 10) }
  }
  return null
}

let server = null
let serverStarted = false
let currentPort = null

function getAvailablePort() {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.listen(0, () => {
      const port = s.address().port
      s.close(() => resolve(port))
    })
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function sendChunks(stream, buffer, chunkSize, delay) {
  let index = 0

  while (index < buffer.length) {
    const chunk = buffer.slice(index, index + chunkSize)
    stream.write(chunk)
    index += chunkSize
    await sleep(delay)
  }

  stream.end()
}

function stopProxy() {
  if (server) {
    server.close()
    server = null
    serverStarted = false
    currentPort = null
    console.log("[slow-network] Proxy stopped")
  }
}

async function startProxy() {
  if (serverStarted) return currentPort

  const port = await getAvailablePort()

  server = http.createServer((req, res) => {
    const targetUrl = req.headers["x-real-url"]

    if (!targetUrl) {
      res.writeHead(500)
      res.end("Missing target url")
      return
    }

    const target = new URL(targetUrl)

    const protocol = target.protocol === "https:" ? https : http

    const chunkSize = parseInt(req.headers["slow-chunk"]) || 256
    const delay = parseInt(req.headers["slow-delay"]) || 200

    const forwardHeaders = { ...req.headers }
    delete forwardHeaders["x-real-url"]
    delete forwardHeaders["slow-network"]
    delete forwardHeaders["slow-chunk"]
    delete forwardHeaders["slow-delay"]
    forwardHeaders["host"] = target.host

    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: target.pathname + target.search,
      method: req.method,
      headers: forwardHeaders,
    }

    const proxyReq = protocol.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)

      const responseChunks = []
      proxyRes.on("data", (chunk) => responseChunks.push(chunk))
      proxyRes.on("error", (err) => {
        console.error("[slow-network] Response error:", err.message)
        if (!res.headersSent) res.writeHead(502)
        res.end()
      })
      proxyRes.on("end", async () => {
        try {
          const buffer = Buffer.concat(responseChunks)
          await sendChunks(res, buffer, chunkSize, delay)
        } catch (err) {
          console.error("[slow-network] Send error:", err.message)
          if (!res.writableEnded) res.end()
        }
      })
    })

    proxyReq.on("error", (err) => {
      console.error("[slow-network] Proxy request error:", err.message)
      res.writeHead(502)
      res.end("Proxy error: " + err.message)
      stopProxy()
    })

    const bodyChunks = []

    req.on("data", (chunk) => bodyChunks.push(chunk))

    req.on("error", (err) => {
      console.error("[slow-network] Request error:", err.message)
      stopProxy()
    })

    req.on("end", async () => {
      try {
        const body = Buffer.concat(bodyChunks)
        await sendChunks(proxyReq, body, chunkSize, delay)
      } catch (err) {
        console.error("[slow-network] Error:", err.message)
        stopProxy()
      }
    })
  })

  server.on("error", (err) => {
    console.error("[slow-network] Proxy error:", err.message)
    stopProxy()
  })

  server.listen(port)

  serverStarted = true
  currentPort = port
  return port
}

module.exports.requestHooks = [
  async (context) => {
    const headers = context.request.getHeaders()
    const slowHeader = headers.find((h) => h.name.toLowerCase() === "slow-network")
    const config = parseSlowNetworkValue(slowHeader?.value)

    if (!config) {
      if (slowHeader)
        console.log("[slow-network] Invalid value. Use format chunk|delay (e.g. 256|200)")
      return
    }

    const port = await startProxy()
    console.log("[slow-network] Sending chunks:", config.chunk, "B,", config.delay, "ms")

    const originalUrl = context.request.getUrl()
    context.request.setHeader("x-real-url", originalUrl)
    context.request.setHeader("slow-chunk", String(config.chunk))
    context.request.setHeader("slow-delay", String(config.delay))
    context.request.setUrl(`http://localhost:${port}`)
  },
]

module.exports.responseHooks = [
  async () => {
    stopProxy()
  },
]

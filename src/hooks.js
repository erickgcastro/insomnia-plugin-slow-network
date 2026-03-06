const http = require("http")
const https = require("https")
const net = require("net")
const { URL } = require("url")

function parseSlowNetworkValue(value) {
  if (!value || typeof value !== "string") return null
  const match = value.trim().match(/^(\d+)\s*\|\s*(\d+)$/)
  if (match) {
    const chunk = parseInt(match[1], 10)
    const delay = parseInt(match[2], 10)
    if (chunk > 0 && delay >= 0) return { chunk, delay }
  }
  return null
}

let server = null
let serverStarted = false
let currentPort = null
let startProxyPromise = null
const requestsUsingProxy = new Set()

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once("error", reject)
    s.listen(0, () => {
      s.removeAllListeners("error")
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
    startProxyPromise = null
    requestsUsingProxy.clear()
    console.log("[slow-network] Proxy stopped")
  }
}

async function startProxy() {
  if (serverStarted && server) return currentPort
  if (startProxyPromise) return startProxyPromise

  startProxyPromise = (async () => {
    try {
      const port = await getAvailablePort()
      await createAndListenServer(port)
      return port
    } catch (err) {
      startProxyPromise = null
      throw err
    }
  })()

  return startProxyPromise
}

async function createAndListenServer(port) {
  server = http.createServer((req, res) => {
    const targetUrl = req.headers["x-real-url"]

    if (!targetUrl) {
      res.writeHead(500)
      res.end("Missing target url")
      return
    }

    let target
    try {
      target = new URL(targetUrl)
    } catch {
      res.writeHead(400)
      res.end("Invalid target URL")
      return
    }

    const protocol = target.protocol === "https:" ? https : http

    const chunkSize = Math.max(1, parseInt(req.headers["slow-chunk"], 10) || 256)
    const delay = Math.max(0, parseInt(req.headers["slow-delay"], 10) || 200)

    const forwardHeaders = { ...req.headers }
    delete forwardHeaders["x-real-url"]
    delete forwardHeaders["x-slow-network"]
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
          const headers = { ...proxyRes.headers }
          delete headers["transfer-encoding"]
          headers["content-length"] = String(buffer.length)
          res.writeHead(proxyRes.statusCode, headers)
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

  await new Promise((resolve, reject) => {
    server.once("error", (err) => {
      stopProxy()
      reject(err)
    })
    server.listen(port, () => {
      serverStarted = true
      currentPort = port
      resolve()
    })
  })

  server.on("error", (err) => {
    console.error("[slow-network] Proxy error:", err.message)
    stopProxy()
  })
}

module.exports.requestHooks = [
  async (context) => {
    const headers = context.request.getHeaders()
    const slowHeader = headers.find((h) => h.name.toLowerCase() === "x-slow-network")
    const config = parseSlowNetworkValue(slowHeader?.value)

    if (!config) {
      if (slowHeader)
        console.log("[slow-network] Invalid value. Use format chunk|delay (e.g. 256|200)")
      return
    }

    const port = await startProxy()
    console.log("[slow-network] Sending chunks:", config.chunk, "B,", config.delay, "ms")

    requestsUsingProxy.add(context.request.getId())
    const originalUrl = context.request.getUrl()
    context.request.setHeader("x-real-url", originalUrl)
    context.request.setHeader("slow-chunk", String(config.chunk))
    context.request.setHeader("slow-delay", String(config.delay))
    context.request.setUrl(`http://localhost:${port}`)
  },
]

module.exports.responseHooks = [
  async (context) => {
    const requestId = context.response?.getRequestId?.()
    if (requestId && requestsUsingProxy.has(requestId)) {
      requestsUsingProxy.delete(requestId)
      stopProxy()
    }
  },
]

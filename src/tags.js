module.exports.templateTags = [
  {
    name: "slowNetworkHeader",
    displayName: "Slow Network: Header Name",
    description: "Returns X-Slow-Network header name",
    args: [],
    async run() {
      return "X-Slow-Network"
    },
  },
  {
    name: "slowNetwork3g",
    displayName: "Slow Network: 3G",
    description: "3G - 256B chunk, 200ms delay",
    args: [],
    async run() {
      return "256|200"
    },
  },
  {
    name: "slowNetworkEdge",
    displayName: "Slow Network: EDGE",
    description: "EDGE - 128B chunk, 400ms delay",
    args: [],
    async run() {
      return "128|400"
    },
  },
  {
    name: "slowNetwork2g",
    displayName: "Slow Network: 2G",
    description: "2G - 64B chunk, 700ms delay",
    args: [],
    async run() {
      return "64|700"
    },
  },
  {
    name: "slowNetworkCustom",
    displayName: "Slow Network: Custom",
    description: "Custom value in chunk|delay format (e.g. 512|100)",
    args: [
      {
        displayName: "Chunk (bytes)",
        description: "Chunk size in bytes",
        type: "number",
        defaultValue: 256,
      },
      {
        displayName: "Delay (ms)",
        description: "Delay between chunks in milliseconds",
        type: "number",
        defaultValue: 200,
      },
    ],
    async run(_, chunk, delay) {
      return `${chunk}|${delay}`
    },
  },
]

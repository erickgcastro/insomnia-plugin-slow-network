module.exports.templateTags = [
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
    description: "Valor customizado no formato chunks|delay (ex: 512|100)",
    args: [
      {
        displayName: "Chunk (bytes)",
        description: "Tamanho do chunk em bytes",
        type: "number",
        defaultValue: 256,
      },
      {
        displayName: "Delay (ms)",
        description: "Delay entre chunks em milissegundos",
        type: "number",
        defaultValue: 200,
      },
    ],
    async run(_, chunk, delay) {
      return `${chunk}|${delay}`
    },
  },
]

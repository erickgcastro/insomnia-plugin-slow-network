const hooks = require("./hooks")
const tags = require("./tags")

module.exports = {
  requestHooks: hooks.requestHooks,
  responseHooks: hooks.responseHooks,
  templateTags: tags.templateTags,
}

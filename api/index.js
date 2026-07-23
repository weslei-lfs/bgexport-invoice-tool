// Vercel auto-detects files under /api as serverless functions. server.js
// already exports the Express app and only calls app.listen() when NOT
// running on Vercel, so requiring it here just gives Vercel the app to wrap.
module.exports = require("../server.js");

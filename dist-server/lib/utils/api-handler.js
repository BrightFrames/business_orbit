"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiHandler = createApiHandler;
const proxy_api_1 = require("./proxy-api");
function createApiHandler(handler, apiPath) {
    return async (request) => {
        // In production on Vercel, proxy to backend (Vercel doesn't have database access)
        // Also proxy if we're not in a local development environment with database
        if (process.env.VERCEL || !process.env.DATABASE_URL) {
            return (0, proxy_api_1.proxyToBackend)(request, apiPath);
        }
        // Otherwise, execute the local handler
        return handler(request);
    };
}

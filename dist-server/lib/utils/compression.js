"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressMessage = compressMessage;
exports.decompressMessage = decompressMessage;
exports.getCompressionRatio = getCompressionRatio;
const zlib_1 = require("zlib");
// Prefix to identify compressed messages
const COMPRESSED_PREFIX = 'GZ:';
/**
 * Compress a message string using gzip and encode as base64.
 * Only compresses if the result is smaller than the original.
 * Short messages (< 100 chars) are typically not worth compressing.
 */
function compressMessage(content) {
    // Don't compress short messages - overhead may exceed savings
    if (content.length < 100) {
        return content;
    }
    try {
        const compressed = (0, zlib_1.gzipSync)(Buffer.from(content, 'utf-8'));
        const base64 = compressed.toString('base64');
        const compressedWithPrefix = COMPRESSED_PREFIX + base64;
        // Only use compressed version if it's actually smaller
        if (compressedWithPrefix.length < content.length) {
            return compressedWithPrefix;
        }
        return content;
    }
    catch (error) {
        console.error('Compression error:', error);
        return content;
    }
}
/**
 * Decompress a message string if it was compressed.
 * Returns original string if not compressed.
 */
function decompressMessage(content) {
    if (!content.startsWith(COMPRESSED_PREFIX)) {
        return content;
    }
    try {
        const base64Data = content.slice(COMPRESSED_PREFIX.length);
        const compressed = Buffer.from(base64Data, 'base64');
        const decompressed = (0, zlib_1.gunzipSync)(compressed);
        return decompressed.toString('utf-8');
    }
    catch (error) {
        console.error('Decompression error:', error);
        // Return original if decompression fails
        return content;
    }
}
/**
 * Calculate compression ratio for logging/monitoring
 */
function getCompressionRatio(original, compressed) {
    if (original.length === 0)
        return 1;
    return compressed.length / original.length;
}

import { gzipSync, gunzipSync } from 'zlib';

// Prefix to identify compressed messages
const COMPRESSED_PREFIX = 'GZ:';

/**
 * Compress a message string using gzip and encode as base64.
 * Only compresses if the result is smaller than the original.
 * Short messages (< 100 chars) are typically not worth compressing.
 */
export function compressMessage(content: string): string {
    // Don't compress short messages - overhead may exceed savings
    if (content.length < 100) {
        return content;
    }

    try {
        const compressed = gzipSync(Buffer.from(content, 'utf-8'));
        const base64 = compressed.toString('base64');
        const compressedWithPrefix = COMPRESSED_PREFIX + base64;

        // Only use compressed version if it's actually smaller
        if (compressedWithPrefix.length < content.length) {
            return compressedWithPrefix;
        }
        return content;
    } catch (error) {
        console.error('Compression error:', error);
        return content;
    }
}

/**
 * Decompress a message string if it was compressed.
 * Returns original string if not compressed.
 */
export function decompressMessage(content: string): string {
    if (!content.startsWith(COMPRESSED_PREFIX)) {
        return content;
    }

    try {
        const base64Data = content.slice(COMPRESSED_PREFIX.length);
        const compressed = Buffer.from(base64Data, 'base64');
        const decompressed = gunzipSync(compressed);
        return decompressed.toString('utf-8');
    } catch (error) {
        console.error('Decompression error:', error);
        // Return original if decompression fails
        return content;
    }
}

/**
 * Calculate compression ratio for logging/monitoring
 */
export function getCompressionRatio(original: string, compressed: string): number {
    if (original.length === 0) return 1;
    return compressed.length / original.length;
}

export interface SlimCSLNode {
    /** Compressed node name. */
    n: string
    /** Compressed attributes. */
    a?: Record<string, string>
    /** Compressed children. */
    c?: Array<SlimCSLNode | string>
}

export interface CSLNode {
    /** Node name (for example, "style", "info", "term"). */
    name: string
    /** Element attributes. */
    attrs: Record<string, string>
    /** Child nodes or text content. */
    children: Array<CSLNode | string>
    [key: string]: unknown
}

export interface CompressedChunk {
    /** Gzip-compressed, base64-encoded JSON payload. */
    gz: string
}

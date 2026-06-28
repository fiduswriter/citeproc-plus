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
}

export interface CslSys {
    /** Required by citeproc-js to fetch citation items. */
    retrieveItem: (id: string) => Record<string, unknown>
    /** Provided by this package; returns the preloaded locale object. */
    retrieveLocale?: (lang: string) => CSLNode | undefined
    [key: string]: unknown
}

export interface CiteprocEngine {
    [key: string]: unknown
}

export interface CSLModuleLike {
    Engine: new (sys: CslSys, style: CSLNode, lang?: string, forceLang?: string) => CiteprocEngine
}

export interface CompressedChunk {
    /** Gzip-compressed, base64-encoded JSON payload. */
    gz: string
}

import type {CSLNode, CompressedChunk, SlimCSLNode} from './types/csl.js'

export type {CompressedChunk}

/**
 * Decompress a chunk that was gzip-compressed and base64-encoded by the build.
 * Returns the data unchanged if it is already a slim CSL node.
 */
export async function decompressChunk<T = SlimCSLNode>(data: SlimCSLNode | CompressedChunk): Promise<T> {
    if (!('gz' in data)) {
        return data as unknown as T
    }

    if (typeof DecompressionStream === 'undefined') {
        throw new Error(
            'DecompressionStream is not available. Compressed CSL chunks require a modern browser or Node 18+.'
        )
    }

    const binary = Uint8Array.from(atob(data.gz), char => char.charCodeAt(0))
    const stream = new DecompressionStream('gzip')
    const writer = stream.writable.getWriter()
    void writer.write(binary)
    void writer.close()
    const text = await new Response(stream.readable).text()
    return JSON.parse(text) as T
}

/**
 * Load the contents of a URL/path as an ArrayBuffer. Supports http(s)/data
 * URLs, file:// URLs, and filesystem paths for Node-based test environments.
 */
async function loadUrlAsBuffer(url: string): Promise<ArrayBuffer> {
    if (url.startsWith('file:')) {
        // @ts-expect-error: Node-only fallback for file:// URLs in test environments.
        const fs = await import('node:fs/promises')
        // @ts-expect-error: Node-only fallback for file:// URLs in test environments.
        const {fileURLToPath} = await import('node:url')
        const buf: Uint8Array = await fs.readFile(fileURLToPath(url))
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }

    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('data:')) {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`)
        }
        return response.arrayBuffer()
    }

    // Relative or root-relative path. In a Node-like test environment, read
    // from the filesystem; in a browser, fetch resolves it against the page.
    const nodeProcess = (globalThis as {process?: {versions?: {node?: string}}}).process
    if (nodeProcess?.versions?.node) {
        // @ts-expect-error: Node-only fallback for test environments.
        const fs = await import('node:fs/promises')
        // @ts-expect-error: Node-only fallback for test environments.
        const path = await import('node:path')
        const filePath = path.resolve(url.replace(/^\/+/, ''))
        const buf: Uint8Array = await fs.readFile(filePath)
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }
    return response.arrayBuffer()
}

/**
 * Fetch a JSON asset that may be served either raw or gzip-compressed.
 * Detects the gzip magic bytes (0x1f 0x8b) and decompresses if needed.
 */
export async function fetchGzJSON<T = unknown>(url: string): Promise<T> {
    const buffer = await loadUrlAsBuffer(url)
    const bytes = new Uint8Array(buffer)

    // gzip magic bytes
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error(
                'DecompressionStream is not available. Compressed CSL chunks require a modern browser or Node 18+.'
            )
        }
        const stream = new DecompressionStream('gzip')
        const writer = stream.writable.getWriter()
        void writer.write(bytes)
        void writer.close()
        const text = await new Response(stream.readable).text()
        return JSON.parse(text) as T
    }

    const text = new TextDecoder().decode(bytes)
    return JSON.parse(text) as T
}

/**
 * Inflate a compressed CSL JSON node into the object shape expected by citeproc-js.
 */
export function inflateCSLObj(slimObj: SlimCSLNode | CSLNode): CSLNode {
    if ('name' in slimObj) {
        // Already inflated
        return slimObj
    }

    const obj: CSLNode = {
        name: slimObj.n,
        attrs: slimObj.a ?? {},
        children: []
    }

    if (slimObj.c) {
        for (const child of slimObj.c) {
            obj.children.push(typeof child === 'string' ? child : inflateCSLObj(child))
        }
    } else if (slimObj.n === 'term') {
        obj.children.push('')
    }

    return obj
}

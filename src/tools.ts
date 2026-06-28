import type {CSLNode, CompressedChunk, SlimCSLNode} from './types/csl'

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

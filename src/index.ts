import type {CSLModuleLike, CSLNode, CiteprocEngine, CslSys, SlimCSLNode} from './types/csl'
import type {CompressedChunk} from './tools'
import {decompressChunk, fetchGzJSON, inflateCSLObj} from './tools'

export {decompressChunk, inflateCSLObj}
export type {CompressedChunk, CSLModuleLike, CSLNode, CiteprocEngine, CslSys, SlimCSLNode}

export class CSL {
    private readonly styles: Record<string, CSLNode> = {}
    private readonly styleChunkCache = new WeakMap<object, Record<string, SlimCSLNode>>()
    private readonly styleUrlCache: Record<string, Record<string, SlimCSLNode>> = {}
    private readonly locales: Record<string, CSLNode> = {}
    private readonly localeChunkCache = new WeakMap<object, SlimCSLNode>()
    private readonly localeUrlCache: Record<string, SlimCSLNode> = {}
    private citeproc: CSLModuleLike | null = null

    /**
     * Return a mapping of all bundled style IDs to their human-readable titles.
     */
    async getStyles(): Promise<Record<string, string>> {
        const {styles} = await import('../build/styles')
        return styles
    }

    /**
     * Create a citeproc Engine asynchronously, downloading the style and locale
     * if they have not been loaded yet.
     */
    async getEngine(
        originalSys: CslSys,
        styleId: string | CSLNode,
        lang?: string,
        forceLang?: string
    ): Promise<CiteprocEngine> {
        await this.getCiteproc()
        const style = await this.getStyle(styleId)
        const locale = await this.getLocale(style, lang, forceLang)
        const sys = Object.assign(Object.create(originalSys), originalSys)
        sys.retrieveLocale = () => locale
        return new this.citeproc!.Engine(sys, style, lang, forceLang)
    }

    /**
     * Create a citeproc Engine synchronously from already cached downloads.
     * Returns `false` if the required style or locale is not cached yet.
     */
    getEngineSync(
        originalSys: CslSys,
        styleId: string | CSLNode,
        lang?: string,
        forceLang?: string
    ): CiteprocEngine | false {
        if (!this.citeproc) {
            return false
        }

        let style: CSLNode
        if (typeof styleId === 'object') {
            style = styleId
        } else {
            const cached = this.styles[styleId]
            if (!cached) {
                return false
            }
            style = cached
        }

        let localeId = forceLang ?? style.attrs['default-locale'] ?? lang ?? 'en-US'
        if (!this.locales[localeId]) {
            localeId = 'en-US'
        }
        const locale = this.locales[localeId]
        if (!locale) {
            return false
        }

        const sys = Object.assign(Object.create(originalSys), originalSys)
        sys.retrieveLocale = () => locale
        return new this.citeproc.Engine(sys, style, lang, forceLang)
    }

    /**
     * Load the citeproc module on demand.
     */
    async getCiteproc(): Promise<void> {
        if (this.citeproc) {
            return
        }
        const {default: csl} = await import('citeproc')
        this.citeproc = csl as CSLModuleLike
    }

    /**
     * Resolve a style identifier to the inflated CSL node expected by citeproc-js.
     * If an already inflated style object is passed in, it is returned as-is.
     */
    async getStyle(styleId: string | CSLNode): Promise<CSLNode> {
        if (typeof styleId === 'object') {
            return styleId
        }

        const {styleLocations} = await import('../build/styles')
        let resolvedId = styleId
        if (!styleLocations[resolvedId]) {
            resolvedId = Object.keys(styleLocations)[0] ?? ''
        }

        if (this.styles[resolvedId]) {
            return this.styles[resolvedId]
        }

        const fileOrData = styleLocations[resolvedId]
        let chunk: Record<string, SlimCSLNode>
        if (typeof fileOrData !== 'string') {
            // Inline bundled object — fileOrData is the style chunk keyed by styleId.
            if (!this.styleChunkCache.has(fileOrData as object)) {
                this.styleChunkCache.set(
                    fileOrData as object,
                    await decompressChunk<Record<string, SlimCSLNode>>(fileOrData as SlimCSLNode | CompressedChunk)
                )
            }
            chunk = this.styleChunkCache.get(fileOrData as object)!
        } else {
            // fileOrData is a URL string — fetch the (possibly gzip-compressed) JSON.
            if (!this.styleUrlCache[fileOrData]) {
                this.styleUrlCache[fileOrData] = await fetchGzJSON<Record<string, SlimCSLNode>>(fileOrData)
            }
            chunk = this.styleUrlCache[fileOrData]
        }

        const styleData = chunk[resolvedId]
        this.styles[resolvedId] = inflateCSLObj(styleData)
        return this.styles[resolvedId]
    }

    /**
     * Resolve the locale for a given style and language.
     */
    async getLocale(style: CSLNode, lang?: string, forceLang?: string): Promise<CSLNode> {
        let localeId = forceLang ?? style.attrs['default-locale'] ?? lang ?? 'en-US'

        if (this.locales[localeId]) {
            return this.locales[localeId]
        }

        const {locales} = await import('../build/locales')
        if (!locales[localeId]) {
            localeId = 'en-US'
        }
        if (this.locales[localeId]) {
            return this.locales[localeId]
        }

        const localeData = locales[localeId]
        let slimLocale: SlimCSLNode
        if (typeof localeData !== 'string') {
            if (!this.localeChunkCache.has(localeData as object)) {
                this.localeChunkCache.set(
                    localeData as object,
                    await decompressChunk(localeData as SlimCSLNode | CompressedChunk)
                )
            }
            slimLocale = this.localeChunkCache.get(localeData as object)!
        } else {
            if (!this.localeUrlCache[localeData]) {
                this.localeUrlCache[localeData] = await fetchGzJSON<SlimCSLNode>(localeData)
            }
            slimLocale = this.localeUrlCache[localeData]
        }

        this.locales[localeId] = inflateCSLObj(slimLocale)
        return this.locales[localeId]
    }
}

import type {CSLNode, SlimCSLNode} from './types/csl.js'
import type {CompressedChunk} from './tools.js'
import {decompressChunk, fetchGzJSON, inflateCSLObj} from './tools.js'

export {decompressChunk, inflateCSLObj}
export type {CompressedChunk, CSLNode, SlimCSLNode}

function isNode(): boolean {
    return !!(globalThis as {process?: {versions?: {node?: string}}}).process?.versions?.node
}

export class CSL {
    private readonly styles: Record<string, CSLNode> = {}
    private readonly styleChunkCache = new WeakMap<object, Record<string, SlimCSLNode>>()
    private readonly styleUrlCache: Record<string, Record<string, SlimCSLNode>> = {}
    private readonly locales: Record<string, CSLNode> = {}
    private readonly localeChunkCache = new WeakMap<object, SlimCSLNode>()
    private readonly localeUrlCache: Record<string, SlimCSLNode> = {}
    private Engine:
        | (new (
              sys: Record<string, unknown>,
              style: CSLNode | string,
              lang?: string,
              forceLang?: string
          ) => Record<string, unknown>)
        | null = null

    /**
     * Register a pre-resolved (inflated) style under a given id so that it can
     * subsequently be resolved by {@link getStyle}, {@link getEngine} and
     * {@link getEngineSync} without consulting the bundled style catalog.
     *
     * This is primarily useful for consumers that supply their own CSL styles
     * (for example loaded from disk) rather than relying on the styles bundled
     * with citeproc-plus.
     */
    registerStyle(id: string, style: CSLNode): void {
        this.styles[id] = style
    }

    /**
     * Return a mapping of all bundled style IDs to their human-readable titles.
     */
    async getStyles(): Promise<Record<string, string>> {
        if (isNode()) {
            const {styles} = await import('../build/styles-node')
            return styles
        }
        const {styles} = await import('../build/styles')
        return styles
    }

    /**
     * Create a citeproc Engine asynchronously, downloading the style and locale
     * if they have not been loaded yet.
     */
    async getEngine(
        originalSys: Record<string, unknown>,
        styleId: string | CSLNode,
        lang?: string,
        forceLang?: string
    ): Promise<Record<string, unknown>> {
        await this.getCiteproc()
        const style = await this.getStyle(styleId)
        const locale = await this.getLocale(style, lang, forceLang)
        const sys = Object.assign(Object.create(originalSys), originalSys)
        sys.retrieveLocale = () => locale
        return new this.Engine!(sys, style, lang, forceLang)
    }

    /**
     * Create a citeproc Engine synchronously from already cached downloads.
     * Returns `false` if the required style or locale is not cached yet.
     */
    getEngineSync(
        originalSys: Record<string, unknown>,
        styleId: string | CSLNode,
        lang?: string,
        forceLang?: string
    ): Record<string, unknown> | false {
        if (!this.Engine) {
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
        return new this.Engine(sys, style, lang, forceLang)
    }

    /**
     * Load the citeproc module on demand.
     */
    async getCiteproc(): Promise<void> {
        if (this.Engine) {
            return
        }
        const {CSL: csl} = await import('citeproc-ts/core')
        this.Engine = csl.Engine
    }

    /**
     * Resolve a style identifier to the inflated CSL node expected by citeproc-js.
     * If an already inflated style object is passed in, it is returned as-is.
     */
    async getStyle(styleId: string | CSLNode): Promise<CSLNode> {
        if (typeof styleId === 'object') {
            return styleId
        }

        // Serve previously registered or cached styles directly, bypassing the
        // bundled style catalog. This allows consumers to register their own
        // styles via registerStyle() under ids that are not part of the bundle.
        if (this.styles[styleId]) {
            return this.styles[styleId]
        }

        let styleLocations: Record<string, string>
        let baseUrl: string | undefined
        if (isNode()) {
            const nodeStyles = await import('../build/styles-node')
            styleLocations = nodeStyles.styleLocations
            baseUrl = nodeStyles.baseUrl
        } else {
            const browserStyles = await import('../build/styles')
            styleLocations = browserStyles.styleLocations
        }
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
            const url = baseUrl ? new URL(fileOrData, baseUrl).href : fileOrData
            if (!this.styleUrlCache[url]) {
                this.styleUrlCache[url] = await fetchGzJSON<Record<string, SlimCSLNode>>(url)
            }
            chunk = this.styleUrlCache[url]
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

        let locales: Record<string, string>
        let baseUrl: string | undefined
        if (isNode()) {
            const nodeLocales = await import('../build/locales-node')
            locales = nodeLocales.locales
            baseUrl = nodeLocales.baseUrl
        } else {
            const browserLocales = await import('../build/locales')
            locales = browserLocales.locales
        }
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
            const url = baseUrl ? new URL(localeData, baseUrl).href : localeData
            if (!this.localeUrlCache[url]) {
                this.localeUrlCache[url] = await fetchGzJSON<SlimCSLNode>(url)
            }
            slimLocale = this.localeUrlCache[url]
        }

        this.locales[localeId] = inflateCSLObj(slimLocale)
        return this.locales[localeId]
    }
}

/**
 * Map of citation style name to a pre-loaded, inflated CSL style node.
 */
export type StyleMap = Record<string, CSLNode>

/**
 * Build a {@link CSL} instance with the provided styles pre-registered.
 *
 * Bundled styles and locales are resolved natively by the returned instance in
 * both the browser and Node.js, so this helper is only needed when supplying
 * additional, caller-provided styles.
 */
export function createCSL(styles: StyleMap = {}): CSL {
    const csl = new CSL()
    for (const [name, style] of Object.entries(styles)) {
        csl.registerStyle(name, style)
    }
    return csl
}

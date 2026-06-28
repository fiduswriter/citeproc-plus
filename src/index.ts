import type {CSLModuleLike, CSLNode, CiteprocEngine, CslSys, SlimCSLNode} from './types/csl'
import {inflateCSLObj} from './tools'

export {inflateCSLObj}
export type {CSLModuleLike, CSLNode, CiteprocEngine, CslSys, SlimCSLNode}

export class CSL {
    private readonly styles: Record<string, CSLNode | Record<string, SlimCSLNode>> = {}
    private readonly locales: Record<string, CSLNode> = {}
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
            if (!cached || !('name' in cached)) {
                return false
            }
            style = cached as CSLNode
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

        const fileOrData = styleLocations[resolvedId]
        if (typeof fileOrData !== 'string') {
            // Inline bundled object — fileOrData is the style chunk keyed by styleId.
            const styleData = fileOrData[resolvedId]
            if (!this.styles[resolvedId]) {
                this.styles[resolvedId] = inflateCSLObj(styleData)
            }
            return this.styles[resolvedId] as CSLNode
        }

        // fileOrData is a URL string — fetch it.
        if (this.styles[fileOrData]) {
            const fileStyles = this.styles[fileOrData] as Record<string, SlimCSLNode>
            if (!this.styles[resolvedId]) {
                this.styles[resolvedId] = inflateCSLObj(fileStyles[resolvedId])
            }
            return this.styles[resolvedId] as CSLNode
        }

        const response = await fetch(fileOrData)
        if (!response.ok) {
            throw new Error(`Failed to fetch style from ${fileOrData}: ${response.status}`)
        }
        const json = (await response.json()) as Record<string, SlimCSLNode>
        this.styles[fileOrData] = json
        this.styles[resolvedId] = inflateCSLObj(json[resolvedId])
        return this.styles[resolvedId] as CSLNode
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
        if (typeof localeData !== 'string') {
            this.locales[localeId] = inflateCSLObj(localeData)
            return this.locales[localeId]
        }

        const response = await fetch(localeData)
        if (!response.ok) {
            throw new Error(`Failed to fetch locale from ${localeData}: ${response.status}`)
        }
        const json = (await response.json()) as SlimCSLNode
        this.locales[localeId] = inflateCSLObj(json)
        return this.locales[localeId]
    }
}

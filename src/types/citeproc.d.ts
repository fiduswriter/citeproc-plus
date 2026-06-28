declare module 'citeproc' {
    export interface CSLNode {
        name: string
        attrs: Record<string, string>
        children: Array<CSLNode | string>
    }

    export interface CslSys {
        retrieveItem: (id: string) => Record<string, unknown>
        retrieveLocale?: (lang: string) => CSLNode | undefined
        [key: string]: unknown
    }

    export interface CiteprocEngine {
        [key: string]: unknown
    }

    export interface CSLModule {
        Engine: new (sys: CslSys, style: CSLNode, lang?: string, forceLang?: string) => CiteprocEngine
        /** Internal XML initializer replaced by the Rollup build. */
        setupXml?: unknown
        /** Internal JSON XML implementation. */
        XmlJSON?: new (...args: unknown[]) => unknown
        /** Internal DOM XML implementation. */
        XmlDOM?: unknown
        /** Internal XML parser. */
        parseXml?: unknown
    }

    const CSL: CSLModule
    export default CSL
}

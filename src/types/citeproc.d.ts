declare module 'citeproc-ts/core' {
    export interface CSLModule {
        Engine: new (
            sys: Record<string, unknown>,
            style: Record<string, unknown> | string,
            lang?: string,
            forceLang?: string
        ) => Record<string, unknown>
        XmlJSON?: new (data: Record<string, unknown>) => Record<string, unknown>
        internals?: Record<string, unknown>
    }

    export const CSL: CSLModule
    export default CSL
}

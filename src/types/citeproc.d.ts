declare module 'citeproc-ts' {
    export interface CSLModule {
        Engine: new (
            sys: Record<string, unknown>,
            style: Record<string, unknown> | string,
            lang?: string,
            forceLang?: string
        ) => Record<string, unknown>
        Output?: {Formats?: Record<string, unknown>}
        getSortKeys?: (...args: unknown[]) => unknown
        Registry?: new (...args: unknown[]) => unknown
    }

    const CSL: CSLModule
    export default CSL
}

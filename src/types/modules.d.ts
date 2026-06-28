declare module 'rollup-plugin-rebase' {
    import type {Plugin} from 'rollup'

    interface RebaseOptions {
        assetFolder?: string
    }

    function rebasePlugin(options?: RebaseOptions): Plugin

    export default rebasePlugin
}

import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import rebasePlugin from 'rollup-plugin-rebase'
import terser from '@rollup/plugin-terser'
import type {RollupOptions} from 'rollup'

const replacePlugin = replace({
    delimiters: ['', ''],
    preventAssignment: false,
    'CSL.setupXml =': 'const unusedXml =',
    'CSL.setupXml': 'new CSL.XmlJSON',
    'CSL.XmlDOM =': 'let XmlDOM =',
    'CSL.XmlDOM': 'XmlDOM',
    'CSL.parseXml =': 'const parseXml =',
    'CSL.parseXml': 'parseXml'
})

const makePlugins = (assetFolder: string, outDir: string) => [
    replacePlugin,
    rebasePlugin({assetFolder}),
    resolve({browser: true}),
    commonjs(),
    typescript({
        tsconfig: './tsconfig.build.json',
        outDir,
        declaration: false,
        declarationMap: false,
        sourceMap: true
    }),
    terser()
]

const config: RollupOptions[] = [
    {
        input: 'src/index.ts',
        makeAbsoluteExternalsRelative: true,
        plugins: makePlugins('assets', 'dist'),
        output: {
            dir: 'dist',
            format: 'es',
            sourcemap: true
        }
    },
    {
        input: 'src/index.ts',
        makeAbsoluteExternalsRelative: true,
        plugins: makePlugins('cjs-assets', 'dist/cjs'),
        output: {
            dir: 'dist/cjs',
            format: 'cjs',
            entryFileNames: '[name].cjs',
            chunkFileNames: '[name]-[hash].cjs',
            sourcemap: true
        }
    }
]

export default config

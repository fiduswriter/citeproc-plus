import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import rebasePlugin from 'rollup-plugin-rebase'
import terser from '@rollup/plugin-terser'
import type {Plugin, RollupOptions} from 'rollup'
import * as fs from 'node:fs'
import * as path from 'node:path'

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

function copyAssets(srcDir: string, destDir: string): Plugin {
    return {
        name: 'copy-assets',
        writeBundle() {
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, {recursive: true})
            }
            for (const entry of fs.readdirSync(srcDir, {withFileTypes: true})) {
                if (entry.isFile()) {
                    fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name))
                }
            }
        }
    }
}

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
        plugins: [
            ...makePlugins('assets', 'dist'),
            copyAssets('./build/styles', './dist/styles'),
            copyAssets('./build/locales', './dist/locales')
        ],
        output: {
            dir: 'dist',
            format: 'es',
            sourcemap: true,
            sourcemapFileNames: 'citeproc-plus-[name]-[hash].js.map'
        }
    },
    {
        input: 'src/index.ts',
        makeAbsoluteExternalsRelative: true,
        plugins: [
            ...makePlugins('cjs-assets', 'dist/cjs'),
            copyAssets('./build/styles', './dist/cjs/styles'),
            copyAssets('./build/locales', './dist/cjs/locales')
        ],
        output: {
            dir: 'dist/cjs',
            format: 'cjs',
            entryFileNames: '[name].cjs',
            chunkFileNames: '[name]-[hash].cjs',
            sourcemap: true,
            sourcemapFileNames: 'citeproc-plus-[name]-[hash].cjs.map'
        }
    }
]

export default config

import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import buble from 'rollup-plugin-buble'
import rebasePlugin from "rollup-plugin-rebase"
import {terser} from 'rollup-plugin-terser'

export default [
    {
        input: 'src/index.js',
        plugins: [
            rebasePlugin({
                assetFolder: 'assets'
            }),
            resolve({browser: true}),
            commonjs(),
            terser()
        ],
        output: // ES module version, for modern browsers
        {
            dir: "dist/module",
            format: "es",
            sourcemap: true
        }
    },
    {
        input: 'src/index.js',
        plugins: [
            rebasePlugin({
                assetFolder: 'assets'
            }),
            resolve({browser: true}),
            commonjs(),
            buble(),
            terser()
        ],
        output: // CJS version
        {
            dir: "dist",
            format: "cjs",
            sourcemap: true
        }
    }
]

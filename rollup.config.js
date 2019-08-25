import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import buble from 'rollup-plugin-buble'
import replace from 'rollup-plugin-replace'
import rebasePlugin from "rollup-plugin-rebase"
import {terser} from 'rollup-plugin-terser'

export default [
    {
        input: 'src/index.js',
        plugins: [
            replace({
                delimiters: ['', ''],
                'CSL.setupXml =': 'const unusedXml =',
                'CSL.setupXml': 'new CSL.XmlJSON',
                'CSL.XmlDOM =': 'let XmlDOM =',
                'CSL.XmlDOM': 'XmlDOM',
                'CSL.parseXml =': 'const parseXml =',
                'CSL.parseXml': 'parseXml'
            }),
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
            replace({
                delimiters: ['', ''],
                'CSL.setupXml =': 'const unusedXml =',
                'CSL.setupXml': 'new CSL.XmlJSON',
                'CSL.XmlDOM =': 'let XmlDOM =',
                'CSL.XmlDOM': 'XmlDOM',
                'CSL.parseXml =': 'const parseXml =',
                'CSL.parseXml': 'parseXml'
            }),
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

import {describe, expect, it} from 'vitest'
import {CSL, inflateCSLObj} from '../src'
import type {CSLNode, SlimCSLNode} from '../src'

describe('inflateCSLObj', () => {
    it('inflates a compressed node', () => {
        const slim: SlimCSLNode = {
            n: 'style',
            a: {version: '1.0'},
            c: [{n: 'info', c: ['title']}]
        }
        const inflated = inflateCSLObj(slim)
        expect(inflated.name).toBe('style')
        expect(inflated.attrs).toEqual({version: '1.0'})
        expect(inflated.children).toHaveLength(1)
        expect((inflated.children[0] as CSLNode).name).toBe('info')
    })

    it('returns already inflated nodes unchanged', () => {
        const node: CSLNode = {name: 'term', attrs: {}, children: ['']}
        expect(inflateCSLObj(node)).toBe(node)
    })

    it('adds an empty child for term nodes without children', () => {
        const slim: SlimCSLNode = {n: 'term'}
        const inflated = inflateCSLObj(slim)
        expect(inflated.children).toEqual([''])
    })
})

describe('CSL', () => {
    it('lists bundled styles', async () => {
        const csl = new CSL()
        const styles = await csl.getStyles()
        expect(Object.keys(styles).length).toBeGreaterThan(0)
        expect(styles['apa']).toBeDefined()
    })

    it('creates an engine asynchronously', async () => {
        const csl = new CSL()
        const sys = {
            retrieveItem: () => ({id: 'test', title: 'Test'}),
            retrieveLocale: () => undefined
        }
        const engine = await csl.getEngine(sys, 'apa', 'en-US')
        expect(engine).toBeDefined()
        expect(typeof engine).toBe('object')
    })

    it('returns false from getEngineSync before caching', () => {
        const csl = new CSL()
        const sys = {retrieveItem: () => ({id: 'test'})}
        expect(csl.getEngineSync(sys, 'apa', 'en-US')).toBe(false)
    })

    it('creates an engine synchronously after async preload', async () => {
        const csl = new CSL()
        const sys = {retrieveItem: () => ({id: 'test'})}
        const engine = await csl.getEngine(sys, 'apa', 'en-US')
        expect(engine).toBeDefined()
        const syncEngine = csl.getEngineSync(sys, 'apa', 'en-US')
        expect(syncEngine).toBeDefined()
        expect(syncEngine).not.toBe(false)
    })
})

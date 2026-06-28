import type {CSLNode, SlimCSLNode} from './types/csl'

/**
 * Inflate a compressed CSL JSON node into the object shape expected by citeproc-js.
 */
export function inflateCSLObj(slimObj: SlimCSLNode | CSLNode): CSLNode {
    if ('name' in slimObj) {
        // Already inflated
        return slimObj
    }

    const obj: CSLNode = {
        name: slimObj.n,
        attrs: slimObj.a ?? {},
        children: []
    }

    if (slimObj.c) {
        for (const child of slimObj.c) {
            obj.children.push(typeof child === 'string' ? child : inflateCSLObj(child))
        }
    } else if (slimObj.n === 'term') {
        obj.children.push('')
    }

    return obj
}

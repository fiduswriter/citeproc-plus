export function inflateStyleObj(slimObj) {
    const obj = {}
    obj.name = slimObj.n
    if (slimObj.a) {
        obj.attrs = slimObj.a
    } else {
        obj.attrs = {}
    }
    obj.children = []
    if (slimObj.c) {
        slimObj.c.forEach(child => {
            if (typeof child === 'string') {
                obj.children.push(child)
            } else {
                obj.children.push(inflateStyleObj(child))
            }
        })
    } else if (slimObj.name === 'term') {
        obj.children.push('')
    }
    return obj
}

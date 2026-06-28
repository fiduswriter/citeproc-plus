import {inflateCSLObj} from "./tools"

export class CSL {

    constructor() {
        this.styles = {}
        this.locales = {}
        this.citeproc = false
    }

    getStyles() {
        return import("../build/styles").then(
            ({styles}) => styles
        )
    }

    getEngine(originalSys, styleId, lang, forceLang) {
        let locale, style
        return Promise.all(
            [
                this.getCiteproc(),
                this.getStyle(styleId).then(styleObj => style = styleObj)
            ]
        ).then(
            () => this.getLocale(style, lang, forceLang).then(localeObj => locale = localeObj)
        ).then(
            () => {

                /*
                 * We clone the original sys so that we can add methods to it without destroying the original.
                 * Sys can be a class instance or a simple object.
                 */

                const sys = Object.assign(Object.create(originalSys), originalSys)
                sys.retrieveLocale = () => locale
                return new this.citeproc.Engine(sys, style, lang, forceLang)
            }
        )


    }

    getEngineSync(originalSys, styleId, lang, forceLang) {
        // Attempt to get engine synchronously based on already cached downloads. Returns false if cache is not available.
        if (!this.citeproc || !this.styles[styleId]) {
            return false
        }
        const style = this.styles[styleId]
        let localeId = forceLang ? forceLang :
            style.attrs['default-locale'] ? style.attrs['default-locale'] :
            lang ? lang :
            'en-US'

        if (!this.locales[localeId]) {
            localeId = 'en-US'
        }
        if (!this.locales[localeId]) {
            return false
        }
        const locale = this.locales[localeId]
        const sys = Object.assign(Object.create(originalSys), originalSys)
        sys.retrieveLocale = () => locale
        return new this.citeproc.Engine(sys, style, lang, forceLang)
    }

    getCiteproc() {
        if (this.citeproc) {
            return Promise.resolve()
        }
        return import("citeproc").then(
            citeprocModule => this.citeproc = citeprocModule.default
        )
    }

    getStyle(styleId) {
        if (typeof styleId === 'object') {

            /*
             * Advanced usage: The styleId is a style definition itself.
             * Return directly without caching.
             */

            return Promise.resolve(styleId)
        }

        return import("../build/styles").then(
            ({styleLocations}) => {
                if (!styleLocations[styleId]) {
                    styleId = Object.keys(styleLocations).find(() => true)
                }
                const fileOrData = styleLocations[styleId]
                if (typeof fileOrData !== "string") {
                    // Inline bundled object — fileOrData is the style file object keyed by styleId
                    if (!this.styles[styleId]) {
                        this.styles[styleId] = inflateCSLObj(fileOrData[styleId])
                    }
                    return Promise.resolve(this.styles[styleId])
                }
                // fileOrData is a URL string — fetch it
                let returnValue
                if (this.styles[fileOrData]) {
                    this.styles[fileOrData][styleId] = inflateCSLObj(this.styles[fileOrData][styleId])
                    returnValue = Promise.resolve(this.styles[fileOrData][styleId])
                } else {
                    returnValue = fetch(fileOrData, {method: "GET"}).then(
                        response => response.json()
                    ).then(
                        json => {
                            this.styles[fileOrData] = json
                            this.styles[fileOrData][styleId] = inflateCSLObj(this.styles[fileOrData][styleId])
                            return Promise.resolve(this.styles[fileOrData][styleId])
                        }
                    )
                }
                return returnValue
            }
        )
    }

    getLocale(style, lang, forceLang) {
        let localeId = forceLang ? forceLang :
            style.attrs['default-locale'] ? style.attrs['default-locale'] :
            lang ? lang :
            'en-US'

        if (this.locales[localeId]) {
            return Promise.resolve(this.locales[localeId])
        }
        return import("../build/locales").then(
            ({locales}) => {
                if (!locales[localeId]) {
                    localeId = 'en-US'
                }
                const localeData = locales[localeId]
                if (typeof localeData !== "string") {
                    // Inline bundled object — use it directly
                    this.locales[localeId] = inflateCSLObj(localeData)
                    return Promise.resolve(this.locales[localeId])
                }
                // localeData is a URL string — fetch it
                return fetch(localeData, {method: "GET"})
                    .then(response => response.json())
                    .then(json => {
                        this.locales[localeId] = inflateCSLObj(json)
                        return Promise.resolve(this.locales[localeId])
                    })
            }
        )
    }
}

import {inflateCSLObj} from "./tools"
export {styles} from "../build/styles"

export class CSL {

    constructor() {
        this.styles = {}
        this.locales = {}
        this.citeproc = false
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
                let returnValue
                if (this.styles[styleId]) {
                    returnValue = Promise.resolve(this.styles[styleId])
                } else {
                    returnValue = fetch(styleLocations[styleId], {method: "GET"}).then(
                        response => response.json()
                    ).then(
                        json => {
                            this.styles[styleId] = inflateCSLObj(json)
                            return Promise.resolve(this.styles[styleId])
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

        if (!this.locales[localeId]) {
            localeId = 'en-US'
        }

        if (this.locales[localeId]) {
            return Promise.resolve(this.locales[localeId])
        }
        return import("../build/locales").then(
            ({locales}) => fetch(locales[localeId], {method: "GET"})
        ).then(
            response => response.json()
        ).then(
            json => {
                this.locales[localeId] = inflateCSLObj(json)
                return Promise.resolve(this.locales[localeId])
            }
        )
    }
}

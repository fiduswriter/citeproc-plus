import {styleLocations} from "../build/styles"
import {locales} from "../build/locales"
import {inflateCSLObj} from "./tools"
export {styles} from "../build/styles"

export class CSL {

    constructor() {
        this.styles = {}
        this.locales = {}
        this.citeproc = false
    }

    async getEngine(originalSys, styleId, lang, forceLang) {
        await this.getCiteproc()
        const style = await this.getStyle(styleId)
        const locale = await this.getLocale(style, lang, forceLang)

        /*
         * We clone the original sys so that we can add methods to it without destroying the original.
         * Sys can be a class instance or a simple object.
         */

        const sys = Object.assign(Object.create(originalSys), originalSys)
        sys.retrieveLocale = () => locale
        return new this.citeproc.Engine(sys, style, lang, forceLang)
    }

    async getCiteproc() {
        if (this.citeproc) {
            return
        }
        const citeprocModule = await import("citeproc")
        this.citeproc = citeprocModule.default
    }

    async getStyle(styleId) {
        if (typeof styleId === 'object') {

            /*
             * Advanced usage: The styleId is a style definition itself.
             * Return directly without caching.
             */

            return styleId
        }

        if (!styleLocations[styleId]) {
            styleId = Object.keys(styleLocations).find(() => true)
        }
        if (this.styles[styleId]) {
            return this.styles[styleId]
        }

        const response = await fetch(styleLocations[styleId], {method: "GET"})
        const json = await response.json()
        this.styles[styleId] = inflateCSLObj(json)
        return this.styles[styleId]
    }

    async getLocale(style, lang, forceLang) {
        let localeId = forceLang ? forceLang :
            style.attrs['default-locale'] ? style.attrs['default-locale'] :
            lang ? lang :
            'en-US'

        if (!locales[localeId]) {
            localeId = 'en-US'
        }

        if (this.locales[localeId]) {
            return this.locales[localeId]
        }

        const response = await fetch(locales[localeId], {method: "GET"})
        const json = await response.json()
        this.locales[localeId] = inflateCSLObj(json)
        return this.locales[localeId]
    }
}

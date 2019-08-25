import CSL from "citeproc"

import {styles} from "../build/styles"
import {locales} from "../build/locales"
import {inflateCSLObj} from "./tools"
export {styleOptions} from "../build/styles"


export class Citeproc {
    constructor() {
        this.styles = {}
        this.locales = {}
    }

    getEngine(originalSys, styleId, lang, forceLang) {

        /*
         * We clone the original sys so that we can add methods to it without destroying the original.
         * Sys can be a class instance or a simple object.
         */
        const sys = Object.assign(Object.create(originalSys), originalSys)

        let style
        return this.getStyle(styleId).then(
            newStyle => {
                style = newStyle
                return this.getLocale(sys, style, lang, forceLang)
            }
        ).then(
            () => new CSL.Engine(sys, style, lang, forceLang)
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

        if (!styles[styleId]) {
            styleId = Object.keys(styles).find(() => true)
        }
        if (this.styles[styleId]) {
            return Promise.resolve(this.styles[styleId])
        }

        return fetch(styles[styleId], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => {
                this.styles[styleId] = inflateCSLObj(json)
                return this.styles[styleId]
            }
        )
    }

    getLocale(sys, style, lang, forceLang) {

        let localeId = forceLang ? forceLang :
            style.attrs['default-locale'] ? style.attrs['default-locale'] :
            lang ? lang :
            'en-US'

        if (!locales[localeId]) {
            localeId = 'en-US'
        }

        sys.retrieveLocale = () => this.locales[localeId]

        if (this.locales[localeId]) {
            return Promise.resolve()
        }

        return fetch(locales[localeId], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => this.locales[localeId] = inflateCSLObj(json)
        )
    }
}

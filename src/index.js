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

    getEngine(sys, styleId, lang, forceLang) {
        let style
        return this.getStyle(styleId).then(
            newStyle => {
                style = newStyle
                return this.getLocale(sys, style, lang, forceLang)
            }
        ).then(
            newSys => new CSL.Engine(newSys, style, lang, forceLang)
        )
    }

    getStyle(styleId) {
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

        if (this.locales[localeId]) {
            return Promise.resolve({
                retrieveItem: id => sys.retrieveItem(id),
                retrieveLocale: () => this.locales[localeId]
            })
        }

        return fetch(locales[localeId], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => {
                this.locales[localeId] = inflateCSLObj(json)
                return {
                    retrieveItem: id => sys.retrieveItem(id),
                    retrieveLocale: () => this.locales[localeId]
                }
            }
        )
    }
}

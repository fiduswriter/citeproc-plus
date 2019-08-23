import CSL from "citeproc"

import {styles} from "./styles"
import {locales} from "./locales"
import {inflateStyleObj} from "./tools"
export {styleOptions} from "./styles"


export class CSLEngine {
    constructor(sys, style, lang, forceLang) {
        this.sys = sys
        if (typeof style === 'string') {
            this.styleId = style
            this.style = false
        } else {
            this.style = style
        }

        this.lang = lang
        this.forceLang = forceLang
        this.locale = false
    }

    init() {
        return this.getStyle().then(
            () => this.getLocale()
        ).then(
            () => new CSL.Engine(this.sys, this.style, this.lang, this.forceLang)
        )
    }

    getStyle() {
        if (this.style) {
            return Promise.resolve()
        }
        return fetch(styles[this.styleId], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => this.style = inflateStyleObj(json)
        )
    }

    getLocale() {
        if (this.sys.retrieveLocale) {
            return Promise.resolve()
        }

        this.sys.retrieveLocale = () => this.locale

        let lang = this.forceLang ? this.forceLang :
            this.style.attrs['default-locale'] ? this.style.attrs['default-locale'] :
            this.lang ? this.lang :
            'en-US'

        if (!locales[lang]) {
            lang = 'en-US'
        }
        return fetch(locales[lang], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => this.locale = inflateStyleObj(json)
        )
    }
}

import CSL from "citeproc"

import {styles} from "./styles"
import {locales} from "./locales"
import {inflateCSLObj} from "./tools"
export {styleOptions} from "./styles"


export class CSLEngine {
    constructor(sys, styleId, lang, forceLang) {
        this.sys = sys
        this.styleId = styleId
        this.lang = lang
        this.forceLang = forceLang
        this.locale = false
        this.style = false
    }

    init() {
        return this.getStyle().then(
            () => this.getLocale()
        ).then(
            () => new CSL.Engine(this.sys, this.style, this.lang, this.forceLang)
        )
    }

    getStyle() {
        if (!(typeof this.styleId === 'string')) {
            this.style = this.styleId
            return Promise.resolve()
        }
        let {styleId} = this
        if (!styles[styleId]) {
            styleId = Object.keys(styles).find(() => true)
        }
        return fetch(styles[styleId], {
            method: "GET"
        }).then(
            response => response.json()
        ).then(
            json => this.style = inflateCSLObj(json)
        )
    }

    getLocale() {
        if (this.sys.retrieveLocale) {
            return Promise.resolve()
        }

        this.origSys = this.sys

        this.sys = {
            retrieveItem: id => this.origSys.retrieveItem(id),
            retrieveLocale: () => this.locale
        }

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
            json => this.locale = inflateCSLObj(json)
        )
    }
}

# citeproc-plus

`citeproc-plus` incorporates 2000+ [styles](https://github.com/citation-style-language/styles/) and 50+ [locale](https://github.com/citation-style-language/locales/) files from the [Citation Style Language](https://citationstyles.org/) project, as well as [citeproc-js](https://github.com/Juris-M/citeproc-js), the JavaScript CSL processor library by Frank Bennett.

This is an **early version** so be aware that the API may change. You can try a demo at https://fiduswriter.github.io/citeproc-plus/.

This package is meant for those who want to use [citeproc-js](https://github.com/Juris-M/citeproc-js), but don't want to have to deal with retrieving and storing citation styles and localizations from other places on the web.

How to use
=======

1. Install it from npm together with your other dependencies:

    npm install citeproc-plus --save

2. Install a plugin for your bundler to handle resources other than JavaScript files as separate files, for example [Webpack's File Loader](https://github.com/webpack-contrib/file-loader). Configure it so that it handles files with the ending `.csljson`. In the case of Webpack's File Loader, that would be a webpack.config.js with setting such as:

```js
module.exports = {
  mode: "production",
  output: {
    publicPath: "dist/",
  },
  module: {
    rules: [
      {
        test: /\.(csljson)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
};
```

3. Import `CSL` and `styles` in your app:

```js
import {CSL} from "citeproc-plus"
```

4. Where in citeproc-js you would have called:

```js
const citeproc = new CSL.Engine(sys, style, lang, forceLang)
```

Do instead:

```js
const csl = new CSL()

const citeproc = await csl.getEngine(
  sys, // required, same as for citeproc-js, but without the retrieveLocale method
  styleId, // required, The id of the style to use
  lang, // optional, same as for citeproc-js
  forceLang // optional, same as for citeproc-js
)
```

to create a selector of all available styles:

```js
csl.getStyles().then(
  styles => dom.innerHTML =
    `<select>${
      Object.entries(styles).map(
        ([key, value]) => `<option value="${key}">${value}</option>`
      ).join('')
    }</select>`
)
```

or if you prefer the `then()`-function, do:

```js
const csl = new CSL()

let citeproc

csl.getEngine(
  sys, // required, same as for citeproc-js, but without the retrieveLocale method
  styleId, // required, The id of the style to use
  lang, // optional, same as for citeproc-js
  forceLang // optional, same as for citeproc-js
).then(
  engine => citeproc = engine
)
```

Notice that you only need one CSL instance with which you can create any number of citeproc instances with different styles, languages and sys objects connected to them.
Notice also that the method to get an engine is asynchronous as it potentially has to download files from your static files storage.


Advanced uses
=======

### JATS ###

There is an extra style with the styleId `jats` that can be used as part of conversion packages. This style is not listed among the list of styles as it is not meant for human consumption.

### Manipulating a style in JavaScript ###

If instead of the styleId you hand it a preprocessed style object it will use it as well without caching.

### Importing CSL ###

Notice that the styles in this package are not stored in the citation style language (CSL) directly. There is a tool to convert CSL to the JSON of preprocessed style object that is needed [here](https://github.com/Juris-M/citeproc-js/blob/master/tools/makejson.py).

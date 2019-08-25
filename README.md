# citeproc-plus
Citeproc-js + citation styles bundled

This is a **proof of concept** so be aware that the API may change or this package may disappear altogether. The point of this package is to show that it's possible to bundle citeproc-js with the localizations and the 2000+ independent styles from https://github.com/citation-style-language/. You can try a demo at https://johanneswilm.github.io/citeproc-plus/.

This package is meant for those who want to use [citeproc-js](https://github.com/Juris-M/citeproc-js), but don't want to have to deal with retrieving and storing citation styles and localizations from other places on the web.

How to install
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

3. Import `Citeproc` and `styleOptions` in your app:

```js
import {Citeproc, styleOptions} from "citeproc-plus"
``` 


4. `styleOptions` is a dictionary of all the available styles with their `title` and `styleId`. To create an ordered list of all available styles, do:

```js
dom.innerHTML = 
  `<select>${
    Object.entries(styleOptions).sort(
      (a,b) => (a[1] > b[1] ? 1 : -1)
    ).map(
      ([key, value]) => `<option value="${key}">${value}</option>`
    ).join('')
  }</select>`
```

5. Use `Citeproc` whenever you need a `CSL.Engine` (see citeproc-js documentation). You only need to initiate `Citeproc` once, and can then use it to obtain new engines with different styles and locales later on. Styles and locales are cached during the browser session. Be aware that the method to get an engine is asyncrhonous as it has to download style and locatio files from your static files storage. To get an engine do:

```js
const processors = new Citeproc()

processors.getEngine(
    sys, // required, same as for citeproc-js, but without the retrieveLocale key
    styleId, // required, The id of the style to use
    lang, // optional, same as for citeproc-js 
    forceLang // optional, same as for citeproc-js
).then(
  engine => ...
)
``` 

Advanced uses
=======

## JATS ##

For conversion purposes there is an extra style with the styleId `jats` that can be used as part of conversion packges. This style is not listed among the list of styles as it is not meant for human consumption.

## Manipulating a style in JavaScript ##

If instead of the styleId you hand it a preprocessed style object it will use it as well without caching.

## Importing CSL ##

Notice that the styles in this package are not stored in the citation style language (CSL) directly. There is a tool to convert CSL to the JSON of preprocessed style object that is needed [here](https://github.com/Juris-M/citeproc-js/blob/master/tools/makejson.py).

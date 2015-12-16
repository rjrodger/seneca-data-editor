![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) visual data editor plugin

# seneca-data-editor
[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-status]


This module can be used in a standalone fashion, but is most often
used with the [seneca-admin](http://github.com/rjrodger/seneca-admin)
plugin to provide a administrative interface for editing all the data
in your system. Inspired by the Django admin interface.

See [seneca-mvp](http://github.com/rjrodger/seneca-mvp) for a usage example.

## Install

```sh
npm install seneca
npm install seneca-data-editor
```

## Usage

To load the plugin:

```JavaScript
seneca.use('data-editor', { /* options */ })
```

To isolate logging output from the plugin, use:
```bash
node your-app.js --seneca.log=plugin:data-editor
```

For more logging options, see the [Seneca logging tutorial](http://senecajs.org/logging-example.html).


## Test

```sh
npm test
```

[npm-badge]: https://badge.fury.io/js/seneca-data-editor.svg
[npm-url]: https://badge.fury.io/js/seneca-data-editor
[travis-badge]: https://api.travis-ci.org/rjrodger/seneca-data-editor.svg
[travis-url]: https://travis-ci.org/rjrodger/seneca-data-editor
[coveralls-badge]:https://coveralls.io/repos/rjrodger/seneca-data-editor/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/rjrodger/seneca-data-editor?branch=master

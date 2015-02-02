# seneca-data-editor

## An visual data editor plugin for the [Seneca](http://senecajs.org) toolkit

This module can be used in a standalone fashion, but is most often
used with the [seneca-admin](http://github.com/rjrodger/seneca-admin)
plugin to provide a administrative interface for editing all the data
in your system. Inspired by the Django admin interface.

See [seneca-mvp](http://github.com/rjrodger/seneca-mvp) for a usage example.


## Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.2.0

Tested on: Node 0.10.36, Seneca 0.6.1



## Install

```sh
npm install seneca
npm install seneca-data-editor
```



## Usage

To load the plugin:

```JavaScript
seneca.use('data-editor', { ... options ... })
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


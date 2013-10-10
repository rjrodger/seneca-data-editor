/* Copyright (c) 2011-2013 Richard Rodger, MIT License, https://github.com/rjrodger/tagx */


(function() {
  "use strict";

  var root          = this
  var previous_tagx = root.tagx

  var has_require = typeof require !== 'undefined'

  var _ = root._

  if( typeof _ === 'undefined' ) {
    if( has_require ) {
      _ = require('underscore')
    }
    else throw new Error('tagx requires underscore, see http://underscorejs.org');
  }


  function split(tagstr) {
    var core_re = /^[ ,]*(.*?)[ ,]*$/g
    var split_re = /[ ,]+/g

    var m = core_re.exec(tagstr)

    var tagcore = m && m[1] || '' 

    var tags = tagcore.split(split_re)
    tags = _.filter(tags,function(tag){
      return 0 < tag.length
    })

    return tags
  }




  function add(tag,tags) {
    var append = true

    var insert = true
    var remove = false

    var tagtext = tag
    var taghole = '!'+tag

    if( '!' == tagtext[0] ) {
      insert = false
      remove = true
      taghole = tagtext
      tagtext = tagtext.substring(1)
    }

    for(var i = 0; i < tags.length; i++) {
      if( insert ) {
        if( tagtext == tags[i] ) {
          append = false
          break
        }
        else if( taghole == tags[i] ) {
          tags.splice(i,1)
          append = false
          break
        }
      }
      else if( remove ) {
        if( tagtext == tags[i] ) {
          tags.splice(i,1)
          append = false
          break
        }
        else if( taghole == tags[i] ) {
          append = false
          break
        }
      }
    }

    if( append ) {
      tags.push(tag)
    }
  }


  function process(conf,tagstrs,seen) {
    conf.case  = void 0 == conf.case  ? true : !!conf.case
    conf.clean = void 0 == conf.clean ? true : !!conf.clean

    seen = seen || {}

    var tags = []
    _.each( tagstrs, function(tagstr) {
      var these = split(tagstr)

      if( !conf.case ) {
        these = _.map(these,function(tag){
          return tag.toLowerCase()
        })
      }

      if( conf.expand ) {
        for(var i = 0; i < these.length; i++) {
          if( seen[these[i]] ) continue;

          var insert = conf.expand[these[i]]

          if( insert ) {
            insert = _.isArray(insert) ? insert : [insert]
            seen[these[i]]=true
            var intags = process( {clean:false,seen:seen}, insert )

            these.splice(i,1,intags)
            these = _.flatten(these)
            i += intags.length-2
          }
        }
      }

      _.each( these, function(tag) {
        add(tag,tags)
      })
    })


    if( conf.clean ) {
      for(var i = 0; i < tags.length; i++) {
        if( '!' == tags[i][0] ) {
          tags.splice(i,1)
          i--
        }
      }
    }

    return tags
  }


  function build(opts,fixedtags) {
    fixedtags = _.filter(fixedtags,function(tagstr){
      return _.isString(tagstr)
    })

    var conf = _.clone(opts)
    if( _.isObject(conf.expand) ) {
      var expandx = tagx({clean:false})
      _.each(conf.expand,function(tags,tag){
        conf.expand[tag] = expandx(tags)
      })
    }
    
    return function() {
      var tagstrs = fixedtags.concat( _.filter( Array.prototype.slice.call(arguments), function(tagstr){
        return _.isString(tagstr)
      }))

      return process(conf, tagstrs)
    }
  }


  function tagx() {
    var first = arguments[0]
    if( _.isObject( first ) ) {
      // returns tagx function for later use
      return build(arguments[0],Array.prototype.slice.call(arguments,1))
    }
    else {
      // returns tag array!
      return build({},Array.prototype.slice.call(arguments))()
    }
  }


  tagx.noConflict = function() {
    root.tagx = previous_tagx;
    return tagx;
  }


  if( typeof exports !== 'undefined' ) {
    if( typeof module !== 'undefined' && module.exports ) {
      exports = module.exports = tagx
    }
    exports.tagx = tagx
  } 
  else {
    root.tagx = tagx
  }

}).call(this);


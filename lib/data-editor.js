/* Copyright (c) 2010-2013 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')

var connect  = require('connect')
var _        = require('underscore')


var name = 'data-editor'


function sendjson(res,obj) {
  var jsonstr = JSON.stringify(obj)
  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0, no-cache, no-store',
    "Content-Length": buffer.Buffer.byteLength(jsonstr) 
  })
  res.end( jsonstr)
}


module.exports = function( options,cb ) {
  var seneca = this
  

  options = seneca.util.deepextend({
    prefix:    '/data-editor',
    zone:      null
  },options)

  
  var m = /^(.*?)\/*$/.exec(options.prefix)
  if( m ) {
    options.prefix = m[1]
  }


  var sysent = seneca.make$('sys','entity')


  seneca.add({role:name,cmd:'init'},init)



  function ensure_ent(canon,done) {
    sysent.load$( canon, function(err,ent){
      // DELIBERATELY IGNORE ERROR
      // underlying sys_entity collection/table may not exist yet

      if( ent ) return done(ent);

      sysent.make$(canon).save$(done)
    })
  }


  function init( args, done ) {
    var zone = args.zone || options.zone

    if( options.init ) {
      ensure_ent({zone:zone,base:'sys',name:'entity'},function(err,sys_entity){

        if( options.init.sys ) {
          seneca.util.recurse(
            ['user','login'],
            function(name,next){
              ensure_ent({zone:zone,base:'sys',name:name},next)
            },
            function(err){
              done(err)
            }
          )
        }

      })
    }
    else done()
  }



  var app = connect()


/*
  app.use(connect.json())
  app.use(si.httprouter(function(app){
    app.get('/conf',function(req,res){
      sendjson(res,{
        prefix: options.prefix,
        login: req.seneca && req.seneca.login && req.seneca.login.token
      })
    })
  }))
*/


  app.use(connect.static(__dirname+'/../web'))

  cb( null, {
    name:'data-editor',
    service:function(req,res,next){
      if( 0 == req.url.indexOf(options.prefix) ) {
        var allow = true

/*
        var allow = req.seneca && req.seneca.user && req.seneca.user.admin
        if( !allow ) {
          allow = options.local && (
            '127.0.0.1' === req.connection.remoteAddress ||
              '::1' === req.connection.remoteAddress
          )
        }
*/
        if( allow ) {
          req.url = req.url.substring(options.prefix.length)

          if('/'===req.url||''===req.url) {
            res.writeHead(301, {
              'Location': options.prefix+'/index.html'
            })
            return res.end()
          }
          else {
            return app(req,res)
          }
        }
      }
      next()
    }
  })
}

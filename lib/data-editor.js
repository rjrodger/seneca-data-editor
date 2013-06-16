/* Copyright (c) 2010-2013 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')
var util    = require('util')

var connect  = require('connect')
var _        = require('underscore')
var tagx     = require('tagx')


var name = 'data-editor'


function nil(){
  _.each(arguments,function(arg){
    if( _.isFunction(arg) ) {
      return arg()
    }
  })
}


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
    zone:      null,
    tags: {
      expand: {
        admin:"admin entzone entbase",
        aaa:"x y"
      },
      default: "foo bar"
    }
  },options)

  
  var m = /^(.*?)\/*$/.exec(options.prefix)
  if( m ) {
    options.prefix = m[1]
  }


  var tagger = tagx({expand:options.tags.expand},options.tags.default)


  seneca.use(
    {name:'jsonrest-api',tag:'data-editor'},
    {
      prefix:options.prefix+'/rest',
      list:{embed:'list'},
      aspect:'user-access'
    })


  var sysent = seneca.make$('sys','entity')


  seneca.add({role:name,cmd:'init'},init)
  seneca.add({role:name,cmd:'entlist'},entlist)
  seneca.add({role:name,cmd:'user-config'},user_config)
  




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

        var entcanons = []
        if( options.init.sys ) {
          _.each( ['user','login'], function(name) {
            entcanons.push( {zone:zone,base:'sys',name:name} )
          })
        }

        var entities = 
              _.isString(args.entities) ? args.entities.split(/\s*,\s*/) : 
              _.isArray(args.entities) ? args.entities : 
              _.keys(args.entities||{})
        
        _.each(entities,function(canonstr){
          var m = /\$?(\w+|-)\/(\w+|-)\/(\w+|-)/.exec(canonstr)
          if( m ) {
            var entcanon = {}
            entcanon.zone = '-' == m[1] ? null : m[1]
            entcanon.base = '-' == m[2] ? null : m[2]
            entcanon.name = '-' == m[3] ? null : m[3]
            entcanons.push(entcanon)
          }
        })

        seneca.util.recurse(
          entcanons,
          function(entcanon,next){
            ensure_ent(entcanon,next)
          },
          function(err){
            done(err)
          }
        )
      })
    }
    else done()
  }




  function entlist( args, done ) {
    var access = (args.user && args.user.access) || args.access || {}

    console.log('access:'+util.inspect(access))

    var q = _.pick( access, 'zone', 'base', 'name' )
    var fn = (0==_.keys(q).length?nil:sysent.list$)

    if( args.user && args.user.admin ) {
      fn = sysent.list$
    }

    fn(q, function(err, list){
      var entlist = _.clone(list||[])
      console.dir(entlist)

      //if( !access.list ) return done( err, {entlist:list} );
      var accesslist = access.list ? access.list : []

      seneca.util.recurse(
        accesslist,
        function(entcanon,next) {
          sysent.list$(entcanon, function(err, list){
            if( err ) return next(err);
            entlist = entlist.concat(list)
            next()
          })
        },
        function(err){
          console.log('entlist A')
          console.dir(entlist)

          // access gives crudq by default
          _.each(entlist, function(ent){
            ent.perm = 'crudq'
          })

          var perm = args.perm$ //args.user && args.user.perm
          console.log('perm:'+util.inspect(perm))

          if( perm ) {
            if( perm.entity ) { //&& _.isFunction(perm.entity.find) ) {
              _.each(entlist, function(ent){
                ent.perm = perm.entity.find(ent) || ent.perm
              })
            }
            if( perm.own ) { //&& _.isFunction(perm.entity.find) ) {
              _.each(entlist, function(ent){
                ent.perm = perm.own.entity.find(ent) || ent.perm
              })
            }
          }

          console.log('entlist B')
          console.dir(entlist)

          done(err,{entlist:entlist})
        }
      )
    })
  }


  function user_config( args, done ) {
    
    var user = args.user || {}
    console.dir(user)

    var grouplist = _.keys( user.groups || {} )
    var usertags = ( user.tags || {} )
    var detags = usertags['data-editor']

    var tags = tagger(user.admin?'admin':'',grouplist,detags)
    console.log(tags)

    var config = {
      tags:tags
    }

    done(null,config)
  }



  seneca.act('role:auth,wrap:user',{pin:{role:name,cmd:'*'},default$:{}})



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
    service:seneca.http({
      prefix:'/data-editor',
      pin:{role:name,cmd:'*'},
      map:{
        entlist:true
      },
      postware:function(req,res,next){
        req.url = req.url.substring(options.prefix.length)

        if(''===req.url) {
          res.writeHead(301, {
            'Location': options.prefix+'/'
          })
          return res.end()
        }
        else if( 0 == req.url.indexOf('/js/init.js') ) {
          console.log('req.seneca.user='+req.seneca.user)

          seneca.act({role:name,cmd:'user-config',req$:req,res$:res},function(err,config){
            if(err) return next(err);

            res.writeHead(200)
            return res.end(
              ';(function(){ var Seneca = window.Seneca = window.Seneca || {};'+
                'Seneca.config = Seneca.config || {}; Seneca.config.data_editor = '+JSON.stringify(config)+' })();')
          })
        }
        else {
          return app(req,res)
        }
      },
    })

/*
    service:function(req,res,next){
      if( 0 == req.url.indexOf(options.prefix) ) {


        CONVERT TO seneca.http

        if('/entlist'===req.url) {
          
          return res.send({entlist:[
            {zone:'z1',base:'b1',name:'n1'},
            {zone:'z1',base:'b2',name:'n1'}
          ]})
        }

        var allow = true


        var allow = req.seneca && req.seneca.user && req.seneca.user.admin
        if( !allow ) {
          allow = options.local && (
            '127.0.0.1' === req.connection.remoteAddress ||
              '::1' === req.connection.remoteAddress
          )
        }

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
      else return next();
    }
*/
  })
}

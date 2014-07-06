/* Copyright (c) 2010-2014 Richard Rodger, MIT License */
"use strict";


var buffer  = require('buffer')
var util    = require('util')

var connect  = require('connect')
var _        = require('underscore')
var tagx     = require('tagx')


var name = 'data-editor'



module.exports = function( options ) {
  var seneca  = this
  var senutil = seneca.export('util')


  options = seneca.util.deepextend({
    prefix:    '/data-editor',
    zone:      null,
    tags: {
      expand: {
        admin:"admin entbase",
      },
      default: "hidecomplex entname entbase !entzone !entquery !entnew"
    },
    admin: { local: false }
  },options)

  options.prefix = senutil.pathnorm( options.prefix )


  var tagger = tagx({expand:options.tags.expand},options.tags.default)




  seneca.use(
    {name:'jsonrest-api',tag:'data-editor'},
    {
      prefix:options.prefix+'/rest',
      list:{embed:'list'},
      admin: { local: options.admin.local },
    })


  var sysent = seneca.make$('sys','entity')


  seneca.add({init:name},init)

  //seneca.add({role:name,cmd:'entlist'},cmd_entlist)
  seneca.add({role:name,cmd:'config'},cmd_config)
  

  
  seneca.add( {role:'jsonrest-api',prefix:options.prefix+'/rest',method:'get',base:'sys',name:'entity'}, function(args, done){
    var seneca = this

    var user = args.user || (args.req$ && args.req$.seneca && args.req$.seneca.user )
    var accesslist = (user && user.perm && user.perm.entity) || []

    var entlist = []

    if( (user && user.admin) || options.admin.local ) {
      accesslist = [{}]
    }

    //console.log(accesslist)

    seneca.util.recurse(
      accesslist,
      function(entry,next) {
        var entcanon = _.pick( entry, 'zone', 'base', 'name' )
        sysent.list$(entcanon, function(err, list){
          if( err ) return next(err);
          entlist = entlist.concat(list)
          next()
        })
      },
      function(err){
        var perm = args.perm$

        if( perm ) {
          if( perm.entity ) {
            _.each(entlist, function(ent){
              ent.perm = perm.entity.find(ent) || ent.perm
            })
          }
          if( perm.own ) {
            _.each(entlist, function(ent){
              ent.perm = perm.own.entity.find(ent) || ent.perm
            })
          }
        }

        //console.log(entlist)

        if( args.id ) {
          var ent = _.find(entlist,function(ent){return ent.id===args.id})
          return done(null,ent)
        }
        else return done(err,{list:entlist})
      }
    )
  })
  




  function cmd_config( args, done ) {
    
    var user = args.user || {}

    if( options.admin.local ) {
      user.admin = true
    }

    var grouplist = _.keys( user.groups || {} )
    var usertags = ( user.tags || {} )
    var detags = usertags['data-editor']

    var tags = tagger(user.admin?'admin':'',grouplist,detags)

    var config = {
      tags:tags
    }

    done(null,config)
  }



  // seneca-user is not a requirement
  // seneca.act('role:auth,wrap:user',{pin:{role:name,cmd:'*'},default$:{}})



  function init( args, done ) {
    var seneca = this

    seneca.act({role:'util',note:true,cmd:'push',key:'admin/units',value:{
      unit:'data-editor',
      spec:{title:'Data Editor',ng:{module:'senecaDataEditorModule',directive:'seneca-data-editor'}},
      content:[
        {type:'js',file:__dirname+'/web/tagx.js'},
        {type:'js',file:__dirname+'/web/ng-grid.js'},
        {type:'js',file:__dirname+'/web/jquery.jsoneditor.js'},
        {type:'js',file:__dirname+'/web/data-editor-ng.js'},
        {type:'css',file:__dirname+'/web/data-editor.css'}
      ]
    },default$:{}})

    done()
  }



  var app = connect()
  app.use(connect.static(__dirname+'/web'))



  function checkperm(req,res,next){
    // TODO: if there is a user, still need to be able to block entirely based on perms

    // requires a user, unless admin.local
    if( options.admin.local ) {
      if( req.seneca.fixedargs && req.seneca.fixedargs.perm$ ) {
        req.seneca.fixedargs.perm$.allow = true
      }
      next()
    }
    else if( req.seneca && req.seneca.user ) {
      next()
    }
    else {
      res.writeHead(401)
      return res.end()
    }
  }


  function buildcontext( req, res, args, act, respond ) {
    var user = req.seneca && req.seneca.user
    if( user ) {
      args.user = user
    }

    act(args,respond)
  }


  var service = {
    prefix:options.prefix,
    pin:{role:name,cmd:'*'},
    premap:checkperm,
    map:{
      entlist:{GET:buildcontext},
      config:true
    },
    endware:function(req,res,next){
      if( 0 != req.url.indexOf(options.prefix) ) return next();

      req = _.clone(req)
      req.url = req.url.substring(options.prefix.length)


      if(''===req.url) {
        res.writeHead(301, {
          'Location': options.prefix+'/'
        })
        return res.end()
      }

      // DELETE
      else if( 0 == req.url.indexOf('/js/init.js') ) {
        var config = {}

        res.writeHead(200)
        return res.end(
          ';(function(){ var Seneca = window.Seneca = window.Seneca || {};'+
            'Seneca.config = Seneca.config || {}; Seneca.config.data_editor = '+JSON.stringify(config)+' })();')
      }

      else {
        return app(req,res,next)
      }
    },
  }


  seneca.act({role:'web',use:service,plugin:'data-editor',config:{prefix:options.prefix}})



  return {
    name:'data-editor'
  }
}

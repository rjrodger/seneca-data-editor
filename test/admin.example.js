/* Copyright (c) 2013-2015 Richard Rodger */
"use strict";


// http://localhost:3000/auth/login?username=u1&password=u1&redirect=true&win=/data-editor
// http://localhost:3000/auth/login?username=a1&password=a1&redirect=true&win=/data-editor


var express      = require('express')
var bodyParser   = require('body-parser')
var cookieParser = require('cookie-parser')

var seneca  = require('seneca')()
seneca.use('mem-store',{web:{dump:true}})
seneca.use('user')
seneca.use('auth')
seneca.use('perm',{entity:[{}]})
seneca.use('..')


seneca.ready( function() {

  var app = express()
  app.use( cookieParser() )
  app.use( bodyParser.json() )

  app.use( seneca.export('web') )

  app.listen( 3000 )


  var userpin = seneca.pin({role:'user',cmd:'*'}) 
  userpin.register({nick:'a1',name:'a1',password:'a1',admin:true})


  userpin.register({nick:'x1',name:'x1',password:'x1'})


  userpin.register({nick:'u1',name:'u1',password:'u1',
                    perm:{entity:[
                      {zone:'z1',base:'b1',perm$:'cr'},
                      {zone:'z1',base:'b2',perm$:'crudq'}
                    ]}})


  var sys_entity = seneca.make$('sys','entity')
  sys_entity.data$({zone:'z1',base:'b1',name:'n1'}).save$()
  sys_entity.data$({zone:'z1',base:'b2',name:'n2'}).save$()
  sys_entity.data$({zone:'z1',base:'b3',name:'n3'}).save$()

  var z1_b1_n1 = seneca.make$('z1','b1','n1')
  z1_b1_n1.data$({a:1,aa:1}).save$()
  z1_b1_n1.data$({a:2,aa:2}).save$()

  var z1_b2_n2 = seneca.make$('z1','b2','n2')
  z1_b2_n2.data$({b:1,bb:1}).save$()
  z1_b2_n2.data$({b:2,bb:2}).save$()

  var z1_b3_n3 = seneca.make$('z1','b3','n3')
  z1_b3_n3.data$({c:1,cc:1}).save$()
  z1_b3_n3.data$({c:2,cc:2}).save$()
})

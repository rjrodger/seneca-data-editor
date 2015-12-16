/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha data-editor.test.js

var util = require('util')

var seneca  = require('seneca')

var assert  = require('chai').assert

var gex  = require('gex')
var tagx = require('tagx')

describe('data-editor', function() {

  it('happy', function( done ){
    seneca({log:'silent',errhandler:done})
      .use('..')
      .ready( function(){ 

        assert.equal('a,b,c', ''+tagx("a b c"))

        done()
      })
  })

  it('access', function( done ){
    seneca({log:'silent',errhandler:done})
      .use('..')
      .ready( function(err){ 
        var si = this

        si.act(
          'role:util, cmd:define_sys_entity',
          {list:"-/-/a,-/-/b,-/A/t,-/A/u,-/B/v"},
          function(err){
            if( err ) return done(err);

            si.make$('sys/entity').list$({},function(err,list){
              if( err ) return done(err);

              assert.ok( gex('*=a;*=b;*=A;*=t;*=A;*=u;*=B;*=v;*')
                         .on(util.inspect(list)) )

/*
            var user = {access:{name:'a'}}

            si.act('role:data-editor,cmd:entlist',{user:user},function(err,out){
              if( err ) return done(err);

              console.dir(out)


              user = {access:{base:'A'}}
              
              si.act('role:data-editor,cmd:entlist',{user:user},function(err,out){
                if( err ) return done(err);

                console.dir(out)
                

                user = {access:{base:'B',list:[{base:'sys',name:'user'},{name:'a'}]}}
              
                si.act('role:data-editor,cmd:entlist',{user:user},function(err,out){
                  if( err ) return done(err);

                  console.dir(out)

                  done()
                })
              })
            })
*/ 
            done()
         })
 
        })
      })
  })
})

/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha data-editor.test.js

var util = require('util')

var seneca  = require('seneca')

var assert  = require('chai').assert

var gex = require('gex')









describe('data-editor', function() {
  

  it('happy', function( done ){
    seneca()
      .use('..')
      .ready( function(err,si){ 
        assert.isNull(err)
        done()
      })
  })


  it('init', function( done ){
    seneca()
      .use('..',{init:{sys:true}})
      .ready( function(err,si){ 
        assert.isNull(err)

        si.act('role:data-editor, cmd:init',function(err){
          if( err ) return done(err);

          si.make$('sys','entity').list$({},function(err,list){
            if( err ) return done(err);

            assert.ok( gex('*=sys;*=entity;*=sys;*=user;*=sys;*=login;*').on(util.inspect(list)) )

/*
            si.act('role:mem-store,cmd:dump',function(err,data){
              console.dir(data)

              done()              
            })
*/
            done()
          })
        })
      })
  })



  it('access', function( done ){
    seneca()
      .use('..',{init:{sys:true}})
      .ready( function(err,si){ 
        assert.isNull(err)

        si.act('role:data-editor, cmd:init',{entities:"-/-/a,-/-/b,-/A/t,-/A/u,-/B/v"},function(err){
          if( err ) return done(err);

          si.make$('sys','entity').list$({},function(err,list){
            if( err ) return done(err);

            assert.ok( gex('*=sys;*=entity;*=sys;*=user;*=sys;*=login;*=a;*=b;*').on(util.inspect(list)) )


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
          })
        })
      })
  })
})

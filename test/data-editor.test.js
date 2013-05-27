/* Copyright (c) 2013 Richard Rodger */
"use strict";


// mocha data-editor.test.js


var seneca  = require('seneca')

var assert  = require('chai').assert











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

            console.dir(list)

            si.act('role:mem-store,cmd:dump',function(err,data){
              console.dir(data)

              done()              
            })
          })
        })
      })
  })

})

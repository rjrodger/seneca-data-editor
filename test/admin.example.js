/* Copyright (c) 2013 Richard Rodger */
"use strict";


var express = require('express')

var seneca  = require('seneca')()
seneca.use('..')


var app = express()
app.use( express.json() )

app.use( seneca.service() )


app.listen( 3000 )


var z1_b1_n1 = seneca.make$('z1','b1','n1')
z1_b1_n1.data$({a:1,aa:1}).save$()
z1_b1_n1.data$({a:2,aa:2}).save$()

var z1_b2_n1 = seneca.make$('z1','b2','n1')
z1_b2_n1.data$({b:1,bb:1}).save$()
z1_b2_n1.data$({b:2,bb:2}).save$()


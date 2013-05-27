/* Copyright (c) 2013 Richard Rodger */
"use strict";


var express = require('express')

var seneca  = require('seneca')()
seneca.use('..')


var app = express()

app.use( seneca.service() )


app.listen( 3000 )

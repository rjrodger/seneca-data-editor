var seneca = require('seneca')()

seneca.use('..')


seneca.ready(function(err){
  if( err ) return console.log(err);

})

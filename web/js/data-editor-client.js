


;(function(){

  var Seneca = window.Seneca = window.Seneca || {}

  var de = Seneca.data_editor = angular.module('data_editor',['ngGrid'])

  de.service('pubsub', function() {
    var cache = {};
    return {
      publish: function(topic, args) { 
	cache[topic] && $.each(cache[topic], function() {
	  this.apply(null, args || []);
	});
      },
      
      subscribe: function(topic, callback) {
	if(!cache[topic]) {
	  cache[topic] = [];
	}
	cache[topic].push(callback);
	return [topic, callback]; 
      },
      
      unsubscribe: function(handle) {
	var t = handle[0];
	cache[t] && d.each(cache[t], function(idx){
	  if(this == handle[1]){
	    cache[t].splice(idx, 1);
	  }
	});
      }
    }
  });


  de.service('entity', function($http) {
    var listfunc = {
      '*':function(kind,query,done){
        $http({method: 'GET', url: '/data-editor/rest/'+kind, cache: false}).
          success(function(data, status) {
            var fields = []

            _.each(data.list,function(row){
              _.each(row,function(v,k){fields[k]=1})
            })
            fields = _.keys(_.omit(fields,['$'])).sort()
            fields = _.map(fields,function(field){
              return {field:field}
            })

            done(null,{
              list:data.list,
              fields:fields
            })
          })
      },
      'sys_entity': function(kind,query,done) {
        $http({method: 'GET', url: '/data-editor/entlist', cache: false}).
          success(function(data, status) {
            done(null,{
              list:data.entlist,
              fields:[
                {field:'zone',},
                {field:'base'},
                {field:'name'}
              ]
            })
          })
      }
    }

    return {
      list: function(kind,query,done){
        var f = listfunc[kind] ? listfunc[kind] : listfunc['*'] 
        f(kind,query,done)
      }
    }
  })


  de.controller('ToolBar', function($scope, pubsub) {
    $scope.showEnts = function(){
      pubsub.publish('view',['ents'])
    }
  })


  de.controller('Table', function($scope, $http, pubsub, entity) {

    $scope.data = []

    $scope.gridOptions = { 
      data: 'data',
      columnDefs: 'coldefs',
      beforeSelectionChange: function(row) {
        var item = $scope.data[row.rowIndex]
        $scope.list([item.zone,item.base,item.name].join('_'))
      }
    }

    $scope.list = function(kind) {
      entity.list(kind,{},function(err,res){
        console.dir(res)
        $scope.coldefs = res.fields
        $scope.data = res.list
      })
    }

    pubsub.subscribe('view',function(view){
      if( 'ents' == view ) $scope.list('sys_entity');
    })


    $scope.list('sys_entity')
  })



})();





;(function(){

  var Seneca = window.Seneca = window.Seneca || {}

  var de = Seneca.data_editor = angular.module('data_editor',['ngGrid'])

  de.factory('pubsub', function() {
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


  de.controller('ToolBar', function($scope, pubsub) {
    $scope.showEnts = function(){
      pubsub.publish('view',['ents'])
    }
  })


  de.controller('Entity', function($scope, $http, pubsub) {

    $scope.data = []

    $scope.gridOptions = { 
      data: 'data',
      columnDefs: 'coldefs',
      beforeSelectionChange: function(item) {
        console.log(item.rowIndex)
        $scope.coldefs = [
          {field:'a'},
        ]
        $scope.data = [{a:1},{a:2}]
      }
    }

    $scope.showEnts = function() {
      $scope.coldefs = [
        {field:'zone',},
        {field:'base'},
        {field:'name'}
      ]
      $scope.data = $scope.entlist
    }

    $scope.loadEnts = function() {
      $http({method: 'GET', url: '/data-editor/entlist', cache: false}).
        success(function(data, status) {
          $scope.entlist = data.entlist
          $scope.showEnts()
        })
    }

    pubsub.subscribe('view',function(view){
      if( 'ents' == view ) $scope.showEnts();
    })


    $scope.loadEnts()
  })



})();


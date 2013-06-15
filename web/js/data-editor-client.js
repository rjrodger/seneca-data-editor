


;(function(){
  var config = Seneca.config.data_editor
  var tagmap = {}
  _.each(config.tags, function(tag){ tagmap[tag]=1 })

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
            var entlist = data.entlist
            entlist = _.map(entlist,function(ent){
              ent.action$ = 'open'
              return ent
            })

            var out = {
              list:data.entlist,
              fields:[
                {field:'action$',displayName:'Action',width:100,maxWidth:100,
                 cellTemplate: '<button ng-click="onAction(\'open\',row)" class="btn btn-primary btn-small">Open</button>'
                },
              ]
            }

            if( tagmap.entzone ) {
              out.fields.push( {field:'zone',displayName:'Zone'} )
            }
            if( tagmap.entbase ) {
              out.fields.push( {field:'base',displayName:'Base'} )
            }
            out.fields.push( {field:'name',displayName:'Name'} )
      
            done(null,out)
          })
      }
    }

    var headers = {
      //'Content-type': 'application/json'
    }

    return {
      list: function(kind,query,done){
        var f = listfunc[kind] ? listfunc[kind] : listfunc['*'] 
        f(kind,query,done)
      },
      save: function(kind,item,done){
        var idpart = void 0 != item.id ? '/'+item.id : ''
        $http({method: 'POST', url: '/data-editor/rest/'+kind+idpart, data:item, headers:headers, cache: false}).
          success(function(data, status) {
            done(null,data)
          })
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
      enableHighlighting: true,
      beforeSelectionChange: function(row) {
        if($scope.opening) { 
          $scope.opening = false
          return
        }
        var item = $scope.data[row.rowIndex]
        pubsub.publish('view',['detail',$scope.kind,item])
      }
    }

    $scope.list = function(kind) {
      $scope.kind = kind || $scope.kind
      entity.list($scope.kind,{},function(err,res){
        $scope.coldefs = res.fields
        $scope.data = res.list
      })
    }

    $scope.onAction = function(name,row) {
      $scope.opening = true
      var item = $scope.data[row.rowIndex]
      $scope.list([item.zone,item.base,item.name].join('_'))
    }

    pubsub.subscribe('view',function(view){
      if( 'ents' == view ) return $scope.list('sys_entity');
      if( 'list' == view ) return $scope.list();
    })


    $scope.list('sys_entity')
  })



  de.controller('Detail', function($scope, pubsub, entity) {

    $scope.visible = false
    $scope.kind = 'none'
    $scope.msg=''
    
    $scope.fields = []

    $scope.show = function(kind,item) {
      $scope.visible = true
      $scope.kind = kind
      $scope.item = item
      $scope.changes = _.clone(item)
      $scope.ident = item.id

      $scope.editable = 'sys_entity' != kind

      var fields = []

      _.each(item,function(v,k){
        if( '$'==k || 'id'==k || ~k.indexOf('$')) return;
        fields.push( {name:k,value:v} )
      })

      $scope.fields = fields
    }


    $scope.newItem = function() {
      $scope.item = {}
      $scope.changes = {}
      $scope.ident = undefined
    }

    $scope.saveItem = function() {
      if( $scope.saving ) return;
      $scope.saving = true
      _.each($scope.changes,function(v,k){
        $scope.item[k]=v
      })
      entity.save($scope.kind,$scope.item,function(err,res){
        $scope.ident = res.id
        $scope.msg = 'Saved'
        $scope.saving = false
        pubsub.publish('view',['list'])
      })
    }

    $scope.closeItem = function() {
      $scope.visible = false
    }

    pubsub.subscribe('view',function(view,kind,item){
      if( 'detail' != view ) return;
      $scope.show(kind,item)
    })

  })

  de.controller('Fields', function($scope, pubsub, entity) {
  })

})();


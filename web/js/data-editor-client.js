


;(function(){
  function noop(){for(var i=0;i<arguments.length;i++)if('function'==typeof(arguments[i]))arguments[i]()}

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
    var entlist = []
    var entmap  = {}
    var fieldmap = {}

    function urlformat() {
      var sb = []
      if( void 0 != arguments[0] ) sb.push(arguments[0]);
      if( void 0 != arguments[1] ) sb.push(arguments[1]);
      if( void 0 != arguments[2] ) sb.push(arguments[2]);
      return sb.join('_')
    }

    function ucf(s) {
      return 0 < s.length ? s[0].toUpperCase()+s.substring(1) : s
    }

    function makefieldmap(kind,ent) {
      if( fieldmap[kind] ) return fieldmap[kind];
      
      var entfieldmap = {}

      _.each(ent&&ent.fields||[],function(field){
        entfieldmap[field.name] = field
      })
      
      return fieldmap[kind] = entfieldmap
    }


    var listfunc = {
      '*':function(kind,query,done){
        $http({method: 'GET', url: '/data-editor/rest/'+kind, cache: false}).
          success(function(data, status) {
            var srcfields = []


            // set up fields predefined from entlist
            var ent = entmap[kind]
            ent = ent || {}
            ent.fields = ent.fields || []


            var entfieldmap = makefieldmap(kind,ent)

            var srcfields = _.keys(entfieldmap)
            
            // setup fields found in data
            var foundfields = {}
            _.each(data.list,function(row){
              _.each(row,function(v,k){
                foundfields[k]=1
                var entfield = entfieldmap[k]=entfieldmap[k]||{}
                if( _.isObject(v) ) {
                  entfield.complex=true 
                }
                if( !entfield.default ) {
                  entfield.default = 
                    _.isArray(v) ? [] :
                    _.isObject(v) ? {} :
                    _.isNumber(v) ? 0 :
                    _.isBoolean(v) ? false :
                    ''
                }
              })
            })
            srcfields = srcfields.concat( _.keys(foundfields ) )


            // remove dups, sort
            srcfields = _.uniq(srcfields)
            
            srcfields.sort(function(a,b){
              if( 'id' == a || 'id' == b ) {
                return 'id'==a ? -1 : 1
              }
              else return a<b ? -1 : b<a ? 1 : 0;
            })

            
            // filter out $ and predefined
            var fields = _.filter(srcfields,function(field){
              var keep = -1==field.indexOf('$')
              var fieldspec = entfieldmap[field]

              if( keep && fieldspec ) {
                if( fieldspec.hide ) {
                  keep = false
                }
                else if( tagmap.hidecomplex && fieldspec.complex ) {
                  keep = false
                }
              }

              return keep
            })


            // create ng-grid specs
            fields = _.map(fields,function(field){
              var gridspec = {field:field,displayName:ucf(field)}
              if( entfieldmap[field] ) {
                var fieldspec = entfieldmap[field]
                gridspec.displayName = fieldspec.niceName ? fieldspec.niceName : gridspec.displayName
              }
              return gridspec
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
            entmap = {}
            entlist = data.entlist

            entlist = _.map(entlist,function(ent){
              entmap[urlformat(ent.zone,ent.base,ent.name)] = ent
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
      },
      load: function(kind,id,done) {
        $http({method: 'GET', url: '/data-editor/rest/'+kind+'/'+id, cache: false}).
          success(function(data, status) {
            done(null,data)
          })
      },
      urlformat: urlformat,
      fieldmap: function(kind) {
        return fieldmap[kind] || {}
      }
    }
  })


  de.controller('ToolBar', function($scope, pubsub) {
    $scope.newbtn = false // 'sys_entity' != kind

    $scope.showEnts = function(){
      pubsub.publish('view',['ents'])
    }

    $scope.newItem = function() {
      pubsub.publish('view',['detail',$scope.kind])
    }

    pubsub.subscribe('kind',function(kind){
      $scope.kind = kind
      $scope.newbtn = 'sys_entity' != kind
    })

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
      pubsub.publish('kind',[kind])
    }

    $scope.onAction = function(name,row) {
      $scope.opening = true
      var item = $scope.data[row.rowIndex]
      $scope.list( entity.urlformat(item.zone,item.base,item.name) )
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

    $scope.loadItem = function(kind,item) {
      (item?entity.load:noop)(kind, item&&item.id, function(err,item,fieldmap){
        var entfieldmap = entity.fieldmap(kind)

        if( !item ) {
          item = {}
          _.each(entfieldmap,function(fieldspec,field){
            item[field]=void 0 == fieldspec.default ? '' : fieldspec.default
          })
        }

        $scope.kind = kind
        $scope.item = item
        $scope.changes = _.clone(item)
        $scope.ident = item.id

        $scope.editable = 'sys_entity' != kind

        var fields = []


        _.each(item,function(v,k){
          if( '$'==k || 'id'==k || ~k.indexOf('$')) return;

          var fieldspec = entfieldmap[k] || {} 
          if( fieldspec.hide ) return;

          var fdef = {name:k,value:v,type:'text',width:200}
          if( _.isObject(v) ) {
            fdef.type='json'
          }
          else if( _.isString(v) ) {
            var len = v.length
            if( 10 < len ) {
              fdef.width = 300
            }
            if( 30 < len || -1 != v.indexOf('\n') ) {
              fdef.type = 'textarea'
              fdef.width = 600
              fdef.height = 100
            }
          }
          else if( _.isNumber(v) ) {
            fdef.width=100
            fdef.type='number'
          }
          else if( _.isBoolean(v) ) {
            fdef.type='checkbox'
          }
          fields.push( fdef )
        })

        fields.sort(function(a,b){
          return a.name==b.name?0:a.name<b.name?-1:1
        })


        $scope.fields = fields

        var jsonmap = {}
        _.each(item,function(v,k){
          if( -1!=k.indexOf('$') ) return;
          if( _.isObject(v) ) {
            setTimeout(function(){
              $('#seneca-jsoneditor-field-'+k).jsonEditor({json:v},{
                change:function(updated){
                  $scope.changes[k]=updated.json
                }
              })
            },1)
          }
        })

        $scope.visible = true
      })
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
      if( kind ) {
        $scope.loadItem(kind,item,true)
      }
    })

  })

  de.controller('Fields', function($scope, pubsub, entity) {
  })

})();



;(function(window, angular) {
  "use strict";

  function noop(){for(var i=0;i<arguments.length;i++)if('function'==typeof(arguments[i]))arguments[i]()}

  var prefix = seneca.config['data-editor'].prefix

  var options = {
    tags:{
      entname:true,
      entedit:true
    }
  }

  var senecaDataEditorModule = angular.module('senecaDataEditorModule',['senecaDataEditorNgGrid'])



  senecaDataEditorModule.service('senecaDataEditorPubSub', function() {
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


  senecaDataEditorModule.service('senecaDataEditorEntity', function($http) {
    var entlist = []
    var entmap  = {}
    var fieldmap = {}

    function urlformat() {
      var sb = []

      var zone = arguments[0]
      var base = arguments[1]
      var name = arguments[2]

      if( null != zone ) {
        sb.push(zone+'_')

        if( null != base ) {
          sb.push(base+'_')
        }
        else {
          sb.push('_')
        }

        sb.push(name)
      }

      else if( null != base ) {
        sb.push(base+'_')
        sb.push(name)
      }

      else {
        sb.push(name)
      }

      //if( void 0 != arguments[0] ) sb.push(arguments[0]+'_');
      //if( void 0 != arguments[1] ) sb.push(arguments[1]+'_');
      //if( void 0 != arguments[2] ) sb.push(arguments[2]);
      //sb.push( arguments[0]+'_' );
      //sb.push( arguments[1]+'_' );
      //sb.push( arguments[2] );

      return sb.join('')
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
        var qstr = 
              '?skip$='+query.skip$ +
              '&limit$='+query.limit$

        if(query.sort) {
          qstr += '&sort$='+query.sort
        }

        if(query.q) {
          qstr += '&q$='+query.q
        }

        $http({method: 'GET', url: prefix+'/rest/'+kind+qstr, cache: false}).
          success(function(data, status) {
            var srcfields = []


            // set up fields predefined from entlist
            var ent = entmap[kind]
            if( !ent ) {
              ent = {fields:{}}
            }

            var entfieldmap = makefieldmap(kind,ent)

            var srcfields = _.keys(entfieldmap)
            
            // setup fields found in data
            var foundfields = {}
            _.each(data.list,function(row){
              _.each(row,function(v,k){
                foundfields[k]=1
                var entfield = entfieldmap[k]=entfieldmap[k]||{}
                entfield.name=k
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
                else if( options.tags.hidecomplex && fieldspec.complex ) {
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
        $http({method: 'GET', url: prefix+'/entlist', cache: false}).
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
                 cellTemplate: '<button ng-click="onAction(\'open\',row)" class="btn btn-primary btn-small data-editor-cell-button">Open</button>'
                },
              ]
            }

            if( options.tags.entzone ) {
              out.fields.push( {field:'zone',displayName:'Zone'} )
            }
            if( options.tags.entbase ) {
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
        $http({method: 'POST', url: prefix+'/rest/'+kind+idpart, data:item, headers:headers, cache: false}).
          success(function(data, status) {
            done(null,data)
          })
      },
      load: function(kind,id,done) {
        $http({method: 'GET', url: prefix+'/rest/'+kind+'/'+id, cache: false}).
          success(function(data, status) {
            done(null,data)
          })
      },
      urlformat: urlformat,
      fieldmap: function(kind) {
        return fieldmap[kind] || {}
      },
      kindparts: function(kind) {
        var parts = kind.split('_')
        if( 0 == parts.length ) return [null,null,null];
        if( 1 == parts.length ) return [null,null,parts[0]];
        if( 2 == parts.length ) return [null,parts[0],parts[1]];
        return [parts[0],parts[1],parts.slice(2).join('_')];
      },
      nicekind: function(kind){
        var parts = this.kindparts(kind)
        var niceparts = []
        if( options.tags.entzone ) niceparts.push(parts[0]||'-');
        if( options.tags.entbase ) niceparts.push(parts[1]||'-');
        if( options.tags.entname ) niceparts.push(parts[2]||'-');
        return niceparts.join('/')
      }
    }
  })



  senecaDataEditorModule.controller('senecaDataEditorToolBar', function($scope, $rootScope, senecaDataEditorPubSub, senecaDataEditorEntity) {
    $scope.newbtn = false 
    $scope.queryvisible = false

    $rootScope.$on('seneca-data-editor/show-ents',function(){
      $scope.showEnts()
    })

    $scope.showEnts = function(){
      senecaDataEditorPubSub.publish('view',['ents'])
    }

    $scope.newItem = function() {
      senecaDataEditorPubSub.publish('view',['detail',$scope.kind])
    }

    $scope.toggleQuery = function() {
      $scope.queryvisible = !$scope.queryvisible
    }

    $scope.search = function() { 
      var qfield  = $scope.qfield && $scope.qfield.name || undefined
      var qstring = $scope.qstring

      var sort  = $scope.qsort && $scope.qsort.name || null
      var ascend  = 'ascend' == $scope.qdirection || void 0 == $scope.qdirection

      var q = []
      if( void 0!=qfield && void 0 !=qstring && 0 < qfield.length && 0 < qstring.length ) {
        q = [{field:qfield,search:qstring}]
      }

      senecaDataEditorPubSub.publish('search',[q,sort,ascend])
    }


    $scope.clear = function() { 
      $scope.qstring = ''
      senecaDataEditorPubSub.publish('search',[[]])
    }

    senecaDataEditorPubSub.subscribe('kind',function(kind){
      $scope.newbtn = 'sys_entity' != kind
      $scope.querybtn = 'sys_entity' != kind
    })

    senecaDataEditorPubSub.subscribe('listed',function(kind){
      if( kind != $scope.kind ) {
        $scope.kind = kind
        var fieldmap = senecaDataEditorEntity.fieldmap(kind)

        var fieldnames = _.filter(_.keys(fieldmap),function(k){return -1==k.indexOf('$')}).sort()
        if(_.contains(fieldnames['id'])){_.remove(fieldnames,'id'); fieldnames=fieldnames.unshift('id')}
        var fields = _.map(fieldnames,function(n){return fieldmap[n]})

        $scope.fields = fields
      }
    })

  })


  senecaDataEditorModule.controller('senecaDataEditorTable', function($scope, $http, senecaDataEditorPubSub, senecaDataEditorEntity, $templateCache) {
    $templateCache.put("footerTemplate.html",
    "<div ng-show=\"showFooter\" class=\"ngFooterPanel\" ng-class=\"{'ui-widget-content': jqueryUITheme, 'ui-corner-bottom': jqueryUITheme}\" ng-style=\"footerStyle()\">" +

//    "    <div class=\"ngTotalSelectContainer\" >" +
//    "        <div class=\"ngFooterTotalItems\" ng-class=\"{'ngNoMultiSelect': !multiSelect}\" >" +
//    "            <span class=\"ngLabel\">{{i18n.ngTotalItemsLabel}} {{maxRows()}}</span><span ng-show=\"filterText.length > 0\" class=\"ngLabel\">({{i18n.ngShowingItemsLabel}} {{totalFilteredItemsLength()}})</span>" +
//    "        </div>" +
//    "        <div class=\"ngFooterSelectedItems\" ng-show=\"multiSelect\">" +
//    "            <span class=\"ngLabel\">{{i18n.ngSelectedItemsLabel}} {{selectedItems.length}}</span>" +
//    "        </div>" +
//    "    </div>" +

    "    <div class=\"ngPagerContainer\" style=\"float: right; margin-top: 10px;\" ng-show=\"enablePaging\" ng-class=\"{'ngNoMultiSelect': !multiSelect}\">" +
    "        <div style=\"float:left; margin-right: 10px;\" class=\"ngRowCountPicker\">" +
    "            <span style=\"float: left; margin-top: 3px;\" class=\"ngLabel\">{{i18n.ngPageSizeLabel}}</span>" +
    "            <select style=\"float: left;height: 27px; width: 100px\" ng-model=\"pagingOptions.pageSize\" >" +
    "                <option ng-repeat=\"size in pagingOptions.pageSizes\">{{size}}</option>" +
    "            </select>" +
    "        </div>" +
    "        <div style=\"float:left; margin-right: 10px; line-height:25px;\" class=\"ngPagerControl\" style=\"float: left; min-width: 135px;\">" +
//    "            <button class=\"ngPagerButton\" ng-click=\"pageToFirst()\" ng-disabled=\"cantPageBackward()\" title=\"{{i18n.ngPagerFirstTitle}}\"><div class=\"ngPagerFirstTriangle\"><div class=\"ngPagerFirstBar\"></div></div></button>" +
    "            <button class=\"ngPagerButton\" ng-click=\"pageBackward()\" ng-disabled=\"cantPageBackward()\" title=\"{{i18n.ngPagerPrevTitle}}\"><div class=\"ngPagerFirstTriangle ngPagerPrevTriangle\"></div></button>" +
    "            <input class=\"ngPagerCurrent\" type=\"number\" style=\"width:50px; height: 24px; margin-top: 1px; padding: 0 4px;\" ng-model=\"pagingOptions.currentPage\"/>" +
    "            <button class=\"ngPagerButton\" ng-click=\"pageForward()\" ng-disabled=\"cantPageForward()\" title=\"{{i18n.ngPagerNextTitle}}\"><div class=\"ngPagerLastTriangle ngPagerNextTriangle\"></div></button>" +
//    "            <button class=\"ngPagerButton\" ng-click=\"pageToLast()\" ng-disabled=\"cantPageToLast()\" title=\"{{i18n.ngPagerLastTitle}}\"><div class=\"ngPagerLastTriangle\"><div class=\"ngPagerLastBar\"></div></div></button>" +
    "        </div>" +
    "    </div>" +
    "</div>"
  );

    $scope.nicekind = ''

    $scope.query = []

    $scope.data = []

    $scope.gridOptions = { 
      data: 'data',
      columnDefs: 'coldefs',
      enableHighlighting: false,

      enablePaging:true,
      pagingOptions:{
        pageSizes: [20,200,2000],
        pageSize: 200,
        totalServerItems: 0,
        currentPage: 1
      },
      showFooter:true,

      beforeSelectionChange: function(row) {
        if($scope.opening) { 
          $scope.opening = false
          return
        }
        var item = $scope.data[row.rowIndex]
        senecaDataEditorPubSub.publish('view',['detail',$scope.kind,item])
      }
    }
    $scope.pagingOptions = $scope.gridOptions.pagingOptions


    $scope.list = function(kind) {
      $scope.kind = kind || $scope.kind
      if( !$scope.kind) return;

      $scope.nicekind = senecaDataEditorEntity.nicekind(kind)

      var q = {
        skip$:($scope.pagingOptions.currentPage-1)*$scope.pagingOptions.pageSize,
        limit$:$scope.pagingOptions.pageSize
      }
      
      if( void 0 != $scope.sort ) {
        var sq = {}
        sq[$scope.sort]=$scope.ascend?1:-1
        q.sort = encodeURI(JSON.stringify(sq))
      }

      var qf = {}
      _.each( $scope.query, function(query) {
        if( query.field && -1==query.field.indexOf('$') ) {
          qf[query.field]=query.search 
        }
      })

      if( 0 < _.keys(qf).length ) {
        q.q=encodeURI(JSON.stringify(qf))
      }

      senecaDataEditorEntity.list($scope.kind,q,function(err,res){
        $scope.coldefs = res.fields
        $scope.data = res.list
        senecaDataEditorPubSub.publish('listed',[$scope.kind])
      })

      senecaDataEditorPubSub.publish('kind',[kind])
    }

    $scope.onAction = function(name,row) {
      $scope.opening = true
      var item = $scope.data[row.rowIndex]
      $scope.list( senecaDataEditorEntity.urlformat(item.zone,item.base,item.name) )
    }


    $scope.$watch('pagingOptions', function (newVal, oldVal) {
      if(newVal !== oldVal ) {
        $scope.pagingOptions.pageSize = parseInt($scope.pagingOptions.pageSize)
        $scope.list()
      }
    }, true)


    senecaDataEditorPubSub.subscribe('view',function(view){
      if( 'ents' == view ) return $scope.list('sys_entity');
      if( 'list' == view ) return $scope.list();
    })

    senecaDataEditorPubSub.subscribe('search',function(query,sort,ascend){
      $scope.query = query
      $scope.sort = sort
      $scope.ascend = ascend
      return $scope.list();
    })

    $scope.list('sys_entity')
  })



  senecaDataEditorModule.controller('senecaDataEditorDetail', function($scope, senecaDataEditorPubSub, senecaDataEditorEntity) {

    $scope.visible = false
    $scope.kind = 'none'
    $scope.msg=''
    
    $scope.fields = []

    $scope.loadItem = function(kind,item) {
      (item?senecaDataEditorEntity.load:noop)(kind, item&&item.id, function(err,item,fieldmap){
        var entfieldmap = senecaDataEditorEntity.fieldmap(kind)

        if( !item ) {
          item = {}
          _.each(entfieldmap,function(fieldspec,field){
            item[field]=void 0 == fieldspec.default ? '' : fieldspec.default
          })
        }

        $scope.kind = kind
        $scope.nicekind = senecaDataEditorEntity.nicekind(kind)
        $scope.item = item
        $scope.changes = _.clone(item)
        $scope.ident = item.id

        $scope.editable =  ('sys_entity' == kind && options.tags.entedit ) || true

        var fields = []

        console.log(item)

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
              $('#seneca-jsoneditor-field-'+k).senecaDataEditor_jsonEditor({json:v},{
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
      senecaDataEditorEntity.save($scope.kind,$scope.item,function(err,res){
        $scope.ident = res.id
        $scope.msg = 'Saved'
        $scope.saving = false
        senecaDataEditorPubSub.publish('view',['list'])
      })
    }

    $scope.closeItem = function() {
      $scope.visible = false
    }

    senecaDataEditorPubSub.subscribe('view',function(view,kind,item){
      if( 'detail' != view ) return;
      if( kind ) {
        $scope.loadItem(kind,item,true)
      }
    })

  })

  senecaDataEditorModule.controller('senecaDataEditorFields', function($scope, senecaDataEditorPubSub, senecaDataEditorEntity) {
  })



  senecaDataEditorModule.service('senecaDataEditorAPI', ['$http',function($http){
    return {
      // TODO: add entlist
      config: function(done){
        $http({method:'GET',url:prefix+'/config', cache:false})
          .success(function(out){
            done(out)
          })
      },
    }
  }])


  senecaDataEditorModule.directive('senecaDataEditor', ['senecaDataEditorAPI', function(senecaDataEditorAPI) {
    var def = {
      restrict:'A',
      scope:{
        options:'@',
      },
      link: function( scope, elem, attrs ){
        var params = scope.$eval(attrs.senecaDataEditor||'{}')||{}
        // options.tags = _.extend(options.tags,tagx(params.tags||''))
        console.log(options)

        senecaDataEditorAPI.config(function(config){
          _.each(config.tags, function(tag){ options.tags[tag]=true })
        })
      },
      templateUrl: prefix+"/_data_editor_template.html"
    }
    return def
  }])


  senecaDataEditorModule.controller("senecaDataEditorCtrl", ["$scope", "$rootScope", "$timeout", 'senecaDataEditorAPI', function($scope, $rootScope, $timeout, senecaDataEditorAPI) {
    $scope.show_main = true

    $rootScope.$on('seneca-data-editor/show-ents',function(){
      $scope.show_main = true
    })
  }]);


}(window, angular));


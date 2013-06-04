


;(function(){

  var Seneca = window.Seneca = window.Seneca || {}

  var de = Seneca.data_editor = angular.module('data_editor',['ngGrid'])

  de.controller('Entity', function($scope, $http) {

    $scope.entlist = []

    $scope.gridOptions = { data: 'entlist' }

    $http({method: 'GET', url: '/data-editor/entlist', cache: false}).
      success(function(data, status) {
        $scope.entlist = data.entlist
        $scope.gridOptions = { data: 'entlist' }
      })
  })

})();


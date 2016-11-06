angular.module('app.controllers', ['firebase'])

.controller('pageCtrl', ['$scope', '$state', '$stateParams', '$cordovaGeolocation','$ionicPlatform', '$interval', '$log', '$ionicPopup',

function ($scope, $state, $stateParams, $cordovaGeolocation, $ionicPlatform, $interval, $log, $ionicPopup) {
  var user = firebase.auth().currentUser;
  var idWatch = null;
  $scope.nombre = user.displayName;
  var ref = firebase.database().ref('rutas/' + user.uid);
  var i = 0;
  var gps;
  var latAnterior, longAnterior;


  function showMap(coords) {
    var mapOptions = {
      center: { lat: coords.latitude, lng: coords.longitude},
      zoom: 18
    };
    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    var marker = new google.maps.Marker({
      position: { lat: coords.latitude, lng: coords.longitude},
      map: map,
      title: 'Aqui estoy!'
    });
  }

  $ionicPlatform.ready(function() {
    $scope.posicion = function () {
      var posOptions = {timeout: 30000, enableHighAccuracy: true, maximumAge: 0};
      $cordovaGeolocation
        .getCurrentPosition(posOptions)
        .then(function (position) {
          var lat  = position.coords.latitude;
          var long = position.coords.longitude;
          var hora = Date.now();
          showMap(position.coords);
          firebase.database().ref('rutas/' + user.uid).push ({
            latitud: lat,
            longitud: long
          });
        }, function(err) {
            $scope.showAlert = function() {
                var alertPopup = $ionicPopup.alert({
                    title: err.code,
                    template: err.message
                });
                alertPopup.then(function(res) {
                });
            };
            $scope.showAlert();
      });
    };

    $scope.ruta = function () {
      // evitamos que se inicie el interval si ya esta iniciado
      if ( angular.isDefined(gps) ) return;
      // creo el intervalo
      gps = $interval(function () {
        // opciones del getCurrentPosition
        var posOptions = {timeout: 10000, enableHighAccuracy: false};
        // pido la posicion GPS
        $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) { // si tiene exito
          var lat  = position.coords.latitude;
          var long = position.coords.longitude;
          // comparo con las posiciones anteriores y si una de las dos es distinta
          if ((lat != latAnterior) || (long != longAnterior)) {
            // actualizo la posicion anterior
            latAnterior = lat;
            longAnterior = long;
            // inserto la poscion en la base de datos
            firebase.database().ref('rutas/' + user.uid + '/').push ({
              latitud: lat,
              longitud: long
            });
            // log de depuracion
            $log.info (i + ':' + lat + ',' + long);
            $log.warn (i + ':' + latAnterior + ',' + longAnterior);
            $scope.lat = lat;
            $scope.long = long;
            showMap(position.coords);
          } //if
          else {
            $log.error (i+ ' No hay posicion nueva');
          }
         i++;
       }, function(err) {

       }); // getCurrentPosition
     }, 1000); // interval
    }; // Fin $scope.ruta

    $scope.paraRuta = function () {
      if (angular.isDefined(gps)) {
        $interval.cancel(gps);
        gps = undefined;
      }
    }; // paraRuta
  }); // ionicPlatformReady
}]) // controller

.controller('loginCtrl', ['$scope', '$state', '$stateParams',
    '$ionicHistory', '$ionicPopup', '$firebaseAuth',
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, $stateParams, $ionicHistory, $ionicPopup, $firebaseAuth) {
  $scope.email = '';
  $scope.user = {
    email: '',
    pass: ''
  };
  // Login con email y password
  $scope.login = function () {
   console.log($scope.user.email);
   console.log($scope.user.pass);
   var auth = $firebaseAuth();

   auth.$signInWithEmailAndPassword($scope.user.email, $scope.user.pass).then(function(firebaseUser) {
     console.log("Signed in as:", firebaseUser.uid);
     $ionicHistory.nextViewOptions({
       disableBack: true
     });
     $state.go ('page');
   }).catch(function(error) {
     $scope.showAlert = function() {
       var alertPopup = $ionicPopup.alert({
         title: error.code,
         template: error.message
       });

       alertPopup.then(function(res) {
         $scope.user.email = '';
         $scope.user.pass = '';
       });
     };
     console.error("Authentication failed:", error);
     $scope.showAlert();
   });
 };
}])

.controller('signupCtrl', ['$scope', '$state', '$stateParams', '$ionicHistory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, $stateParams, $ionicHistory) {
  $scope.user = {
    nombre: '',
    email: '',
    pass: ''
  };


  if (firebase.auth().currentUser) {
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }, function(error) {
      // An error happened.
    });
  }
  $scope.signup = function () {
    //var auth = $firebaseAuth();
    firebase.auth().createUserWithEmailAndPassword($scope.user.email, $scope.user.pass).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // [START_EXCLUDE]
        if (errorCode == 'auth/weak-password') {
          alert('The password is too weak.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
      })
      .then(function (user) {
          user.updateProfile({
            displayName: $scope.user.nombre,
            photoURL: 'https://dummyimage.com/200x200/000/ffffff.png&text=NO+FOTO'
          }).then(function() {
            firebase.database().ref('usuarios/' + user.uid).set({
              username: user.displayName,
              email: user.email,
              profile_picture : user.photoURL
            });
          }, function(error) {
            // An error happened.
          });
          $ionicHistory.nextViewOptions({
            disableBack: true
          });
          $state.go('page');
      });
  };
}])

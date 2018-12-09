
const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

firebase.initializeApp({
  apiKey: 'AIzaSyA3U4uDMhOJf7e-HzAowbkV_z0ziJqzS9c',
  authDomain: 'snapoolweb.firebaseapp.com',
  projectId: 'snapoolweb'
});

// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

db.collection("users").add({
    username: "Rico",
    friends: ["smyung","John"],
    hasRequest: [true, false]
})
.then(function(docRef) {
    console.log("Document written with ID: ", docRef.id);
})
.catch(function(error) {
    console.error("Error adding document: ", error);
});


var path = "";

var showParking = false;
var showBikeways = false;
var showSoBiHubs = false;

function addLayerToMap (type) {
  // Flip the boolean value of the path
  if (type === 1) {
    showParking = !showParking;
  } else if (type === 2) {
    showBikeways = !showBikeways;
  } else if (type === 3) {
    showSoBiHubs = !showSoBiHubs;
  }

  if (showParking === true) {
    // Case 1 - Add Parking lyer
    path = buildOpenHamParkingPath();
    map.data.loadGeoJson(path);
  }

  if (showBikeways === true) {
    // Case 2 - Add Bike Paths Layer
    path = buildOpenHamBikewayPath();
    map.data.loadGeoJson(path);
  }

  if (showSoBiHubs === true) {
    // Case 3 - Add Social Bike Hubs Layer
    path = buildOpenHamSoBiHubsPath();
    map.data.loadGeoJson(path);
  }

}

// Hamilton Open Data Path Builder for SoBi Hubs (GeoJSON)
function buildOpenHamSoBiHubsPath () {
  return "https://opendata.arcgis.com/datasets/b5fb1c2cbccc4513ad4cac3671905ccc_18.geojson";
}

// Hamilton Open Data Path Builder for Bikeways (GeoJSON)
function buildOpenHamBikewayPath () {
  return "https://opendata.arcgis.com/datasets/544170b5b1be435592b1aea014265c7d_7.geojson";
}

// Hamilton Open Data Path Builder for Parking Lots (GeoJSON)
function buildOpenHamParkingPath () {
  return "https://opendata.arcgis.com/datasets/d56d996d4725499da2a5555aa5e5b651_5.geojson";
}

// Google Maps API Path Builder
function buildGoogleMapsPath () {
  return "https://maps.googleapis.com/maps/api/js?key=AIzaSyALHXXP3dCiXonCzhlfIwhILPbpFAmfQE4&callback=initMap";
}

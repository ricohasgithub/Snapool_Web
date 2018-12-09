
var path = "";

var showParking = false;
var showBikeways = false;
var showSoBiHubs = false;
var showFriends = false;

function addLayerToMap (type) {
  // Flip the boolean value of the path
  if (type === 1) {
    showParking = !showParking;
  } else if (type === 2) {
    showBikeways = !showBikeways;
  } else if (type === 3) {
    showSoBiHubs = !showSoBiHubs;
  } else if (type === 4) {
    showFriends = !showFriends;
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

  if (showFriends === true) {
    // Case 4 - Show Friends on Map
    // TODO: Set Bitmojis as points
    map.data.addGeoJson(getFriendsLayer());
  }

}

// This function builds and returns a .geojson file from your friend's geopoints
function getFriendsLayer () {

  var GeoJSON = require('geojson');
  var data = buildDataFiles();
  return GeoJSON.parse(data, {Point: ['lat', 'lng'], include: ['name']});

}

// This method builds a data array and returns it
function buildDataFiles () {
  var data = [
  { name: 'SmYung', category: 'Store', street: 'Market', lat: 42.284, lng: -79.843 },
  { name: 'John', category: 'House', street: 'Broad', lat: 42.124, lng: -79.633 },
  { name: 'Alex', category: 'Office', street: 'South', lat: 42.123, lng: -79.034 }
  ];
  return data;
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

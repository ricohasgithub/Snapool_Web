
var request = new XMLHttpRequest();
var path = buildGoogleMapsPath();

request.open('GET', path, true);

function displayMap () {
  var map = new google.maps.Map(document.getElementById("map")
}

function addLayer () {

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

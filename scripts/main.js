
var path = "";

var FGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          -79.91128921508789,
          43.258455839234294
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          -79.85034942626953,
          43.257205668363206
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          -79.86185073852539,
          43.272924698999574
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          -79.86571311950684,
          43.26070608211925
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          -79.87197875976562,
          43.26208118960853
        ]
      }
    }
  ]
};

var scConnected = false;
var showParking = false;
var showBikeways = false;
var showSoBiHubs = false;
var showFriends = false;

function addLayerToMap (type) {

  // Check to see if the user had connected to snapchat
  // if (type === 4 && scConnected === false) {
  //   window.alert("Please Connect to Snapchat First!");
  // }

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
    map.data.addGeoJson(FGeoJSON);
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

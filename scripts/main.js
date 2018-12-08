
var loginButtonIconId = 'my-login-button-target';
var loginParamsObj = {
  // Override this parameter `handleAuthGrantFlowCallback`
  handleAuthGrantFlowCallback:
    function handleAuthGrantFlowCallback(){
      // TO START THE OAUTH2.0 AUTHORIZATION
      // GRANT FLOW, POINT THIS CALLBACK TO
      // YOUR APPLICATION’S BACKEND HANDLER
    },
  clientId: 'your-clientId',
  redirectURI: 'your-redirectURI', // REMOVE THIS
  scopeList: ['your-scope(s)'], // REMOVE THIS
};

// Cryptography

var _crypto = require('crypto');

var OAUTH2_STATE_BYTES = 32;
var REGEX_PLUS_SIGN = /\+/g;
var REGEX_FORWARD_SLASH = /\//g;
var REGEX_EQUALS_SIGN = /=/g;

var generateRandomBytes = function generateRandomBytes(size) {
  return _crypto.randomBytes(size);
};

var generateBase64UrlEncodedString = function generateBase64UrlEncodedString(bytesToEncode) {
  return bytesToEncode
    .toString('base64')
    .replace(REGEX_PLUS_SIGN, '-')
    .replace(REGEX_FORWARD_SLASH, '_')
    .replace(REGEX_EQUALS_SIGN, '');
};

var generateClientState = exports.generateClientState = function generateClientState() {
  return generateBase64UrlEncodedString(
    generateRandomBytes(OAUTH2_STATE_BYTES)
  );
};

// Hamilton Open Data Path Builder
function buildOpenHamPath () {
  return "https://opendata.arcgis.com/datasets/d56d996d4725499da2a5555aa5e5b651_5.geojson";
}

// Google Maps API Path Builder
function buildGoogleMapsPath () {
  return "https://maps.googleapis.com/maps/api/js?key=AIzaSyALHXXP3dCiXonCzhlfIwhILPbpFAmfQE4&callback=initMap";
}

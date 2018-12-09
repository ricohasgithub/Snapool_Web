
var GeoJSON = require('geojson');

var data = [
{ name: 'SmYung', category: 'Store', street: 'Market', lat: 42.284, lng: -79.843 },
{ name: 'John', category: 'House', street: 'Broad', lat: 42.124, lng: -79.633 },
{ name: 'Alex', category: 'Office', street: 'South', lat: 42.123, lng: -79.034 }
];

// This function builds and returns a .geojson file from your friend's geopoints (getFriendsLayer)
window.FGeoJSON = function () {
  return GeoJSON.parse(data, {Point: ['lat', 'lng'], include: ['name']});
};

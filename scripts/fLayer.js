
map.data.addGeoJson(getFriendsLayer());

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

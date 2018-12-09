(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function(GeoJSON) {
  GeoJSON.version = '0.5.0';

  // Allow user to specify default parameters
  GeoJSON.defaults = {
    doThrows: {
      invalidGeometry: false
    }
  };

  function InvalidGeometryError() {
    var args = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];
    var item = args.shift();
    var params = args.shift();

    Error.apply(this, args);
    this.message = this.message || "Invalid Geometry: " + 'item: ' + JSON.stringify(item) + ', params: ' + JSON.stringify(params);
  }

  InvalidGeometryError.prototype = Error;


  GeoJSON.errors = {
    InvalidGeometryError: InvalidGeometryError
  };

  //exposing so this can be overriden maybe by geojson-validation or the like
  GeoJSON.isGeometryValid = function(geometry){
    if(!geometry || !Object.keys(geometry).length)
      return false;

    return !!geometry.type && !!geometry.coordinates && Array.isArray(geometry.coordinates) && !!geometry.coordinates.length;
  };

  // The one and only public function.
  // Converts an array of objects into a GeoJSON feature collection
  GeoJSON.parse = function(objects, params, callback) {
    var geojson,
        settings = applyDefaults(params, this.defaults),
        propFunc;

    geomAttrs.length = 0; // Reset the list of geometry fields
    setGeom(settings);
    propFunc = getPropFunction(settings);

    if (Array.isArray(objects)) {
      geojson = {"type": "FeatureCollection", "features": []};
      objects.forEach(function(item){
        geojson.features.push(getFeature({item:item, params: settings, propFunc:propFunc}));
      });
      addOptionals(geojson, settings);
    } else {
      geojson = getFeature({item:objects, params: settings, propFunc:propFunc});
      addOptionals(geojson, settings);
    }

    if (callback && typeof callback === 'function') {
      callback(geojson);
    } else {
      return geojson;
    }
  };

  // Helper functions
  var geoms = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeoJSON'],
      geomAttrs = [];

  // Adds default settings to user-specified params
  // Does not overwrite any settings--only adds defaults
  // the the user did not specify
  function applyDefaults(params, defaults) {
    var settings = params || {};

    for(var setting in defaults) {
      if(defaults.hasOwnProperty(setting) && !settings[setting]) {
        settings[setting] = defaults[setting];
      }
    }

    return settings;
  }

  // Adds the optional GeoJSON properties crs and bbox
  // if they have been specified
  function addOptionals(geojson, settings){
    if(settings.crs && checkCRS(settings.crs)) {
      if(settings.isPostgres)
        geojson.geometry.crs = settings.crs;
      else
        geojson.crs = settings.crs;
    }
    if (settings.bbox) {
      geojson.bbox = settings.bbox;
    }
    if (settings.extraGlobal) {
      geojson.properties = {};
      for (var key in settings.extraGlobal) {
        geojson.properties[key] = settings.extraGlobal[key];
      }
    }
  }

  // Verify that the structure of CRS object is valid
  function checkCRS(crs) {
    if (crs.type === 'name') {
        if (crs.properties && crs.properties.name) {
            return true;
        } else {
            throw new Error('Invalid CRS. Properties must contain "name" key');
        }
    } else if (crs.type === 'link') {
        if (crs.properties && crs.properties.href && crs.properties.type) {
            return true;
        } else {
            throw new Error('Invalid CRS. Properties must contain "href" and "type" key');
        }
    } else {
        throw new Error('Invald CRS. Type attribute must be "name" or "link"');
    }
  }

  // Moves the user-specified geometry parameters
  // under the `geom` key in param for easier access
  function setGeom(params) {
    params.geom = {};

    for(var param in params) {
      if(params.hasOwnProperty(param) && geoms.indexOf(param) !== -1){
        params.geom[param] = params[param];
        delete params[param];
      }
    }

    setGeomAttrList(params.geom);
  }

  // Adds fields which contain geometry data
  // to geomAttrs. This list is used when adding
  // properties to the features so that no geometry
  // fields are added the properties key
  function setGeomAttrList(params) {
    for(var param in params) {
      if(params.hasOwnProperty(param)) {
        if(typeof params[param] === 'string') {
          geomAttrs.push(params[param]);
        } else if (typeof params[param] === 'object') { // Array of coordinates for Point
          geomAttrs.push(params[param][0]);
          geomAttrs.push(params[param][1]);
        }
      }
    }

    if(geomAttrs.length === 0) { throw new Error('No geometry attributes specified'); }
  }

  // Creates a feature object to be added
  // to the GeoJSON features array
  function getFeature(args) {
    var item = args.item,
      params = args.params,
      propFunc = args.propFunc;

    var feature = { "type": "Feature" };

    feature.geometry = buildGeom(item, params);
    feature.properties = propFunc.call(item);

    return feature;
  }

  function isNested(val){
    return (/^.+\..+$/.test(val));
  }

  // Assembles the `geometry` property
  // for the feature output
  function buildGeom(item, params) {
    var geom = {},
        attr;

    for(var gtype in params.geom) {
      var val = params.geom[gtype];

      // Geometry parameter specified as: {Point: 'coords'}
      if(typeof val === 'string' && item.hasOwnProperty(val)) {
        if(gtype === 'GeoJSON') {
          geom = item[val];
        } else {
          geom.type = gtype;
          geom.coordinates = item[val];
        }
      }

      /* Handle things like:
      Polygon: {
        northeast: ['lat', 'lng'],
        southwest: ['lat', 'lng']
      }
      */
      else if(typeof val === 'object' && !Array.isArray(val)) {
        /*jshint loopfunc: true */
        var points = Object.keys(val).map(function(key){
          var order = val[key];
          var newItem = item[key];
          return buildGeom(newItem, {geom:{ Point: order}});
        });
        geom.type = gtype;
        /*jshint loopfunc: true */
        geom.coordinates = [].concat(points.map(function(p){
          return p.coordinates;
        }));
      }

      // Geometry parameter specified as: {Point: ['lat', 'lng']}
      else if(Array.isArray(val) && item.hasOwnProperty(val[0]) && item.hasOwnProperty(val[1])){
        geom.type = gtype;
        geom.coordinates = [Number(item[val[1]]), Number(item[val[0]])];
      }

      // Geometry parameter specified as: {Point: ['container.lat', 'container.lng']}
      else if(Array.isArray(val) && isNested(val[0]) && isNested(val[1])){
        var coordinates = [];
        for (var i = 0; i < val.length; i++) {	// i.e. 0 and 1
          var paths = val[i].split('.');
          var itemClone = item;
          for (var j = 0; j < paths.length; j++) {
            if (!itemClone.hasOwnProperty(paths[j])) {
              return false;
            }
            itemClone = itemClone[paths[j]];	// Iterate deeper into the object
          }
          coordinates[i] = itemClone;
        }
        geom.type = gtype;
        geom.coordinates = [Number(coordinates[1]), Number(coordinates[0])];
      }
    }

    if(params.doThrows && params.doThrows.invalidGeometry && !GeoJSON.isGeometryValid(geom)){
      throw new InvalidGeometryError(item, params);
    }

    return geom;
  }

  // Returns the function to be used to
  // build the properties object for each feature
  function getPropFunction(params) {
    var func;

    if(!params.exclude && !params.include) {
      func = function(properties) {
        for(var attr in this) {
          if(this.hasOwnProperty(attr) && (geomAttrs.indexOf(attr) === -1)) {
            properties[attr] = this[attr];
          }
        }
      };
    } else if(params.include) {
      func = function(properties) {
        params.include.forEach(function(attr){
          properties[attr] = this[attr];
        }, this);
      };
    } else if(params.exclude) {
      func = function(properties) {
        for(var attr in this) {
          if(this.hasOwnProperty(attr) && (geomAttrs.indexOf(attr) === -1) && (params.exclude.indexOf(attr) === -1)) {
            properties[attr] = this[attr];
          }
        }
      };
    }

    return function() {
      var properties = {};

      func.call(this, properties);

      if(params.extra) { addExtra(properties, params.extra); }
      return properties;
    };
  }

  // Adds data contained in the `extra`
  // parameter if it has been specified
  function addExtra(properties, extra) {
    for(var key in extra){
      if(extra.hasOwnProperty(key)) {
        properties[key] = extra[key];
      }
    }

    return properties;
  }

}(typeof module == 'object' ? module.exports : window.GeoJSON = {}));

},{}],2:[function(require,module,exports){

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

},{"geojson":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9nZW9qc29uL2dlb2pzb24uanMiLCJzY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiKGZ1bmN0aW9uKEdlb0pTT04pIHtcbiAgR2VvSlNPTi52ZXJzaW9uID0gJzAuNS4wJztcblxuICAvLyBBbGxvdyB1c2VyIHRvIHNwZWNpZnkgZGVmYXVsdCBwYXJhbWV0ZXJzXG4gIEdlb0pTT04uZGVmYXVsdHMgPSB7XG4gICAgZG9UaHJvd3M6IHtcbiAgICAgIGludmFsaWRHZW9tZXRyeTogZmFsc2VcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gSW52YWxpZEdlb21ldHJ5RXJyb3IoKSB7XG4gICAgdmFyIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkgOiBbXTtcbiAgICB2YXIgaXRlbSA9IGFyZ3Muc2hpZnQoKTtcbiAgICB2YXIgcGFyYW1zID0gYXJncy5zaGlmdCgpO1xuXG4gICAgRXJyb3IuYXBwbHkodGhpcywgYXJncyk7XG4gICAgdGhpcy5tZXNzYWdlID0gdGhpcy5tZXNzYWdlIHx8IFwiSW52YWxpZCBHZW9tZXRyeTogXCIgKyAnaXRlbTogJyArIEpTT04uc3RyaW5naWZ5KGl0ZW0pICsgJywgcGFyYW1zOiAnICsgSlNPTi5zdHJpbmdpZnkocGFyYW1zKTtcbiAgfVxuXG4gIEludmFsaWRHZW9tZXRyeUVycm9yLnByb3RvdHlwZSA9IEVycm9yO1xuXG5cbiAgR2VvSlNPTi5lcnJvcnMgPSB7XG4gICAgSW52YWxpZEdlb21ldHJ5RXJyb3I6IEludmFsaWRHZW9tZXRyeUVycm9yXG4gIH07XG5cbiAgLy9leHBvc2luZyBzbyB0aGlzIGNhbiBiZSBvdmVycmlkZW4gbWF5YmUgYnkgZ2VvanNvbi12YWxpZGF0aW9uIG9yIHRoZSBsaWtlXG4gIEdlb0pTT04uaXNHZW9tZXRyeVZhbGlkID0gZnVuY3Rpb24oZ2VvbWV0cnkpe1xuICAgIGlmKCFnZW9tZXRyeSB8fCAhT2JqZWN0LmtleXMoZ2VvbWV0cnkpLmxlbmd0aClcbiAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIHJldHVybiAhIWdlb21ldHJ5LnR5cGUgJiYgISFnZW9tZXRyeS5jb29yZGluYXRlcyAmJiBBcnJheS5pc0FycmF5KGdlb21ldHJ5LmNvb3JkaW5hdGVzKSAmJiAhIWdlb21ldHJ5LmNvb3JkaW5hdGVzLmxlbmd0aDtcbiAgfTtcblxuICAvLyBUaGUgb25lIGFuZCBvbmx5IHB1YmxpYyBmdW5jdGlvbi5cbiAgLy8gQ29udmVydHMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBpbnRvIGEgR2VvSlNPTiBmZWF0dXJlIGNvbGxlY3Rpb25cbiAgR2VvSlNPTi5wYXJzZSA9IGZ1bmN0aW9uKG9iamVjdHMsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICB2YXIgZ2VvanNvbixcbiAgICAgICAgc2V0dGluZ3MgPSBhcHBseURlZmF1bHRzKHBhcmFtcywgdGhpcy5kZWZhdWx0cyksXG4gICAgICAgIHByb3BGdW5jO1xuXG4gICAgZ2VvbUF0dHJzLmxlbmd0aCA9IDA7IC8vIFJlc2V0IHRoZSBsaXN0IG9mIGdlb21ldHJ5IGZpZWxkc1xuICAgIHNldEdlb20oc2V0dGluZ3MpO1xuICAgIHByb3BGdW5jID0gZ2V0UHJvcEZ1bmN0aW9uKHNldHRpbmdzKTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdHMpKSB7XG4gICAgICBnZW9qc29uID0ge1widHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsIFwiZmVhdHVyZXNcIjogW119O1xuICAgICAgb2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICBnZW9qc29uLmZlYXR1cmVzLnB1c2goZ2V0RmVhdHVyZSh7aXRlbTppdGVtLCBwYXJhbXM6IHNldHRpbmdzLCBwcm9wRnVuYzpwcm9wRnVuY30pKTtcbiAgICAgIH0pO1xuICAgICAgYWRkT3B0aW9uYWxzKGdlb2pzb24sIHNldHRpbmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2VvanNvbiA9IGdldEZlYXR1cmUoe2l0ZW06b2JqZWN0cywgcGFyYW1zOiBzZXR0aW5ncywgcHJvcEZ1bmM6cHJvcEZ1bmN9KTtcbiAgICAgIGFkZE9wdGlvbmFscyhnZW9qc29uLCBzZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2soZ2VvanNvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBnZW9qc29uO1xuICAgIH1cbiAgfTtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb25zXG4gIHZhciBnZW9tcyA9IFsnUG9pbnQnLCAnTXVsdGlQb2ludCcsICdMaW5lU3RyaW5nJywgJ011bHRpTGluZVN0cmluZycsICdQb2x5Z29uJywgJ011bHRpUG9seWdvbicsICdHZW9KU09OJ10sXG4gICAgICBnZW9tQXR0cnMgPSBbXTtcblxuICAvLyBBZGRzIGRlZmF1bHQgc2V0dGluZ3MgdG8gdXNlci1zcGVjaWZpZWQgcGFyYW1zXG4gIC8vIERvZXMgbm90IG92ZXJ3cml0ZSBhbnkgc2V0dGluZ3MtLW9ubHkgYWRkcyBkZWZhdWx0c1xuICAvLyB0aGUgdGhlIHVzZXIgZGlkIG5vdCBzcGVjaWZ5XG4gIGZ1bmN0aW9uIGFwcGx5RGVmYXVsdHMocGFyYW1zLCBkZWZhdWx0cykge1xuICAgIHZhciBzZXR0aW5ncyA9IHBhcmFtcyB8fCB7fTtcblxuICAgIGZvcih2YXIgc2V0dGluZyBpbiBkZWZhdWx0cykge1xuICAgICAgaWYoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkoc2V0dGluZykgJiYgIXNldHRpbmdzW3NldHRpbmddKSB7XG4gICAgICAgIHNldHRpbmdzW3NldHRpbmddID0gZGVmYXVsdHNbc2V0dGluZ107XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNldHRpbmdzO1xuICB9XG5cbiAgLy8gQWRkcyB0aGUgb3B0aW9uYWwgR2VvSlNPTiBwcm9wZXJ0aWVzIGNycyBhbmQgYmJveFxuICAvLyBpZiB0aGV5IGhhdmUgYmVlbiBzcGVjaWZpZWRcbiAgZnVuY3Rpb24gYWRkT3B0aW9uYWxzKGdlb2pzb24sIHNldHRpbmdzKXtcbiAgICBpZihzZXR0aW5ncy5jcnMgJiYgY2hlY2tDUlMoc2V0dGluZ3MuY3JzKSkge1xuICAgICAgaWYoc2V0dGluZ3MuaXNQb3N0Z3JlcylcbiAgICAgICAgZ2VvanNvbi5nZW9tZXRyeS5jcnMgPSBzZXR0aW5ncy5jcnM7XG4gICAgICBlbHNlXG4gICAgICAgIGdlb2pzb24uY3JzID0gc2V0dGluZ3MuY3JzO1xuICAgIH1cbiAgICBpZiAoc2V0dGluZ3MuYmJveCkge1xuICAgICAgZ2VvanNvbi5iYm94ID0gc2V0dGluZ3MuYmJveDtcbiAgICB9XG4gICAgaWYgKHNldHRpbmdzLmV4dHJhR2xvYmFsKSB7XG4gICAgICBnZW9qc29uLnByb3BlcnRpZXMgPSB7fTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBzZXR0aW5ncy5leHRyYUdsb2JhbCkge1xuICAgICAgICBnZW9qc29uLnByb3BlcnRpZXNba2V5XSA9IHNldHRpbmdzLmV4dHJhR2xvYmFsW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgdGhlIHN0cnVjdHVyZSBvZiBDUlMgb2JqZWN0IGlzIHZhbGlkXG4gIGZ1bmN0aW9uIGNoZWNrQ1JTKGNycykge1xuICAgIGlmIChjcnMudHlwZSA9PT0gJ25hbWUnKSB7XG4gICAgICAgIGlmIChjcnMucHJvcGVydGllcyAmJiBjcnMucHJvcGVydGllcy5uYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDUlMuIFByb3BlcnRpZXMgbXVzdCBjb250YWluIFwibmFtZVwiIGtleScpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjcnMudHlwZSA9PT0gJ2xpbmsnKSB7XG4gICAgICAgIGlmIChjcnMucHJvcGVydGllcyAmJiBjcnMucHJvcGVydGllcy5ocmVmICYmIGNycy5wcm9wZXJ0aWVzLnR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIENSUy4gUHJvcGVydGllcyBtdXN0IGNvbnRhaW4gXCJocmVmXCIgYW5kIFwidHlwZVwiIGtleScpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGQgQ1JTLiBUeXBlIGF0dHJpYnV0ZSBtdXN0IGJlIFwibmFtZVwiIG9yIFwibGlua1wiJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gTW92ZXMgdGhlIHVzZXItc3BlY2lmaWVkIGdlb21ldHJ5IHBhcmFtZXRlcnNcbiAgLy8gdW5kZXIgdGhlIGBnZW9tYCBrZXkgaW4gcGFyYW0gZm9yIGVhc2llciBhY2Nlc3NcbiAgZnVuY3Rpb24gc2V0R2VvbShwYXJhbXMpIHtcbiAgICBwYXJhbXMuZ2VvbSA9IHt9O1xuXG4gICAgZm9yKHZhciBwYXJhbSBpbiBwYXJhbXMpIHtcbiAgICAgIGlmKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwYXJhbSkgJiYgZ2VvbXMuaW5kZXhPZihwYXJhbSkgIT09IC0xKXtcbiAgICAgICAgcGFyYW1zLmdlb21bcGFyYW1dID0gcGFyYW1zW3BhcmFtXTtcbiAgICAgICAgZGVsZXRlIHBhcmFtc1twYXJhbV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2V0R2VvbUF0dHJMaXN0KHBhcmFtcy5nZW9tKTtcbiAgfVxuXG4gIC8vIEFkZHMgZmllbGRzIHdoaWNoIGNvbnRhaW4gZ2VvbWV0cnkgZGF0YVxuICAvLyB0byBnZW9tQXR0cnMuIFRoaXMgbGlzdCBpcyB1c2VkIHdoZW4gYWRkaW5nXG4gIC8vIHByb3BlcnRpZXMgdG8gdGhlIGZlYXR1cmVzIHNvIHRoYXQgbm8gZ2VvbWV0cnlcbiAgLy8gZmllbGRzIGFyZSBhZGRlZCB0aGUgcHJvcGVydGllcyBrZXlcbiAgZnVuY3Rpb24gc2V0R2VvbUF0dHJMaXN0KHBhcmFtcykge1xuICAgIGZvcih2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgICBpZihwYXJhbXMuaGFzT3duUHJvcGVydHkocGFyYW0pKSB7XG4gICAgICAgIGlmKHR5cGVvZiBwYXJhbXNbcGFyYW1dID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGdlb21BdHRycy5wdXNoKHBhcmFtc1twYXJhbV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwYXJhbXNbcGFyYW1dID09PSAnb2JqZWN0JykgeyAvLyBBcnJheSBvZiBjb29yZGluYXRlcyBmb3IgUG9pbnRcbiAgICAgICAgICBnZW9tQXR0cnMucHVzaChwYXJhbXNbcGFyYW1dWzBdKTtcbiAgICAgICAgICBnZW9tQXR0cnMucHVzaChwYXJhbXNbcGFyYW1dWzFdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmKGdlb21BdHRycy5sZW5ndGggPT09IDApIHsgdGhyb3cgbmV3IEVycm9yKCdObyBnZW9tZXRyeSBhdHRyaWJ1dGVzIHNwZWNpZmllZCcpOyB9XG4gIH1cblxuICAvLyBDcmVhdGVzIGEgZmVhdHVyZSBvYmplY3QgdG8gYmUgYWRkZWRcbiAgLy8gdG8gdGhlIEdlb0pTT04gZmVhdHVyZXMgYXJyYXlcbiAgZnVuY3Rpb24gZ2V0RmVhdHVyZShhcmdzKSB7XG4gICAgdmFyIGl0ZW0gPSBhcmdzLml0ZW0sXG4gICAgICBwYXJhbXMgPSBhcmdzLnBhcmFtcyxcbiAgICAgIHByb3BGdW5jID0gYXJncy5wcm9wRnVuYztcblxuICAgIHZhciBmZWF0dXJlID0geyBcInR5cGVcIjogXCJGZWF0dXJlXCIgfTtcblxuICAgIGZlYXR1cmUuZ2VvbWV0cnkgPSBidWlsZEdlb20oaXRlbSwgcGFyYW1zKTtcbiAgICBmZWF0dXJlLnByb3BlcnRpZXMgPSBwcm9wRnVuYy5jYWxsKGl0ZW0pO1xuXG4gICAgcmV0dXJuIGZlYXR1cmU7XG4gIH1cblxuICBmdW5jdGlvbiBpc05lc3RlZCh2YWwpe1xuICAgIHJldHVybiAoL14uK1xcLi4rJC8udGVzdCh2YWwpKTtcbiAgfVxuXG4gIC8vIEFzc2VtYmxlcyB0aGUgYGdlb21ldHJ5YCBwcm9wZXJ0eVxuICAvLyBmb3IgdGhlIGZlYXR1cmUgb3V0cHV0XG4gIGZ1bmN0aW9uIGJ1aWxkR2VvbShpdGVtLCBwYXJhbXMpIHtcbiAgICB2YXIgZ2VvbSA9IHt9LFxuICAgICAgICBhdHRyO1xuXG4gICAgZm9yKHZhciBndHlwZSBpbiBwYXJhbXMuZ2VvbSkge1xuICAgICAgdmFyIHZhbCA9IHBhcmFtcy5nZW9tW2d0eXBlXTtcblxuICAgICAgLy8gR2VvbWV0cnkgcGFyYW1ldGVyIHNwZWNpZmllZCBhczoge1BvaW50OiAnY29vcmRzJ31cbiAgICAgIGlmKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnICYmIGl0ZW0uaGFzT3duUHJvcGVydHkodmFsKSkge1xuICAgICAgICBpZihndHlwZSA9PT0gJ0dlb0pTT04nKSB7XG4gICAgICAgICAgZ2VvbSA9IGl0ZW1bdmFsXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBnZW9tLnR5cGUgPSBndHlwZTtcbiAgICAgICAgICBnZW9tLmNvb3JkaW5hdGVzID0gaXRlbVt2YWxdO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8qIEhhbmRsZSB0aGluZ3MgbGlrZTpcbiAgICAgIFBvbHlnb246IHtcbiAgICAgICAgbm9ydGhlYXN0OiBbJ2xhdCcsICdsbmcnXSxcbiAgICAgICAgc291dGh3ZXN0OiBbJ2xhdCcsICdsbmcnXVxuICAgICAgfVxuICAgICAgKi9cbiAgICAgIGVsc2UgaWYodHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAvKmpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuICAgICAgICB2YXIgcG9pbnRzID0gT2JqZWN0LmtleXModmFsKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICB2YXIgb3JkZXIgPSB2YWxba2V5XTtcbiAgICAgICAgICB2YXIgbmV3SXRlbSA9IGl0ZW1ba2V5XTtcbiAgICAgICAgICByZXR1cm4gYnVpbGRHZW9tKG5ld0l0ZW0sIHtnZW9tOnsgUG9pbnQ6IG9yZGVyfX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgZ2VvbS50eXBlID0gZ3R5cGU7XG4gICAgICAgIC8qanNoaW50IGxvb3BmdW5jOiB0cnVlICovXG4gICAgICAgIGdlb20uY29vcmRpbmF0ZXMgPSBbXS5jb25jYXQocG9pbnRzLm1hcChmdW5jdGlvbihwKXtcbiAgICAgICAgICByZXR1cm4gcC5jb29yZGluYXRlcztcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICAvLyBHZW9tZXRyeSBwYXJhbWV0ZXIgc3BlY2lmaWVkIGFzOiB7UG9pbnQ6IFsnbGF0JywgJ2xuZyddfVxuICAgICAgZWxzZSBpZihBcnJheS5pc0FycmF5KHZhbCkgJiYgaXRlbS5oYXNPd25Qcm9wZXJ0eSh2YWxbMF0pICYmIGl0ZW0uaGFzT3duUHJvcGVydHkodmFsWzFdKSl7XG4gICAgICAgIGdlb20udHlwZSA9IGd0eXBlO1xuICAgICAgICBnZW9tLmNvb3JkaW5hdGVzID0gW051bWJlcihpdGVtW3ZhbFsxXV0pLCBOdW1iZXIoaXRlbVt2YWxbMF1dKV07XG4gICAgICB9XG5cbiAgICAgIC8vIEdlb21ldHJ5IHBhcmFtZXRlciBzcGVjaWZpZWQgYXM6IHtQb2ludDogWydjb250YWluZXIubGF0JywgJ2NvbnRhaW5lci5sbmcnXX1cbiAgICAgIGVsc2UgaWYoQXJyYXkuaXNBcnJheSh2YWwpICYmIGlzTmVzdGVkKHZhbFswXSkgJiYgaXNOZXN0ZWQodmFsWzFdKSl7XG4gICAgICAgIHZhciBjb29yZGluYXRlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7IGkrKykge1x0Ly8gaS5lLiAwIGFuZCAxXG4gICAgICAgICAgdmFyIHBhdGhzID0gdmFsW2ldLnNwbGl0KCcuJyk7XG4gICAgICAgICAgdmFyIGl0ZW1DbG9uZSA9IGl0ZW07XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBwYXRocy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgaWYgKCFpdGVtQ2xvbmUuaGFzT3duUHJvcGVydHkocGF0aHNbal0pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW1DbG9uZSA9IGl0ZW1DbG9uZVtwYXRoc1tqXV07XHQvLyBJdGVyYXRlIGRlZXBlciBpbnRvIHRoZSBvYmplY3RcbiAgICAgICAgICB9XG4gICAgICAgICAgY29vcmRpbmF0ZXNbaV0gPSBpdGVtQ2xvbmU7XG4gICAgICAgIH1cbiAgICAgICAgZ2VvbS50eXBlID0gZ3R5cGU7XG4gICAgICAgIGdlb20uY29vcmRpbmF0ZXMgPSBbTnVtYmVyKGNvb3JkaW5hdGVzWzFdKSwgTnVtYmVyKGNvb3JkaW5hdGVzWzBdKV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYocGFyYW1zLmRvVGhyb3dzICYmIHBhcmFtcy5kb1Rocm93cy5pbnZhbGlkR2VvbWV0cnkgJiYgIUdlb0pTT04uaXNHZW9tZXRyeVZhbGlkKGdlb20pKXtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkR2VvbWV0cnlFcnJvcihpdGVtLCBwYXJhbXMpO1xuICAgIH1cblxuICAgIHJldHVybiBnZW9tO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0aGUgZnVuY3Rpb24gdG8gYmUgdXNlZCB0b1xuICAvLyBidWlsZCB0aGUgcHJvcGVydGllcyBvYmplY3QgZm9yIGVhY2ggZmVhdHVyZVxuICBmdW5jdGlvbiBnZXRQcm9wRnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIGZ1bmM7XG5cbiAgICBpZighcGFyYW1zLmV4Y2x1ZGUgJiYgIXBhcmFtcy5pbmNsdWRlKSB7XG4gICAgICBmdW5jID0gZnVuY3Rpb24ocHJvcGVydGllcykge1xuICAgICAgICBmb3IodmFyIGF0dHIgaW4gdGhpcykge1xuICAgICAgICAgIGlmKHRoaXMuaGFzT3duUHJvcGVydHkoYXR0cikgJiYgKGdlb21BdHRycy5pbmRleE9mKGF0dHIpID09PSAtMSkpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXNbYXR0cl0gPSB0aGlzW2F0dHJdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYocGFyYW1zLmluY2x1ZGUpIHtcbiAgICAgIGZ1bmMgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIHBhcmFtcy5pbmNsdWRlLmZvckVhY2goZnVuY3Rpb24oYXR0cil7XG4gICAgICAgICAgcHJvcGVydGllc1thdHRyXSA9IHRoaXNbYXR0cl07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYocGFyYW1zLmV4Y2x1ZGUpIHtcbiAgICAgIGZ1bmMgPSBmdW5jdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvcih2YXIgYXR0ciBpbiB0aGlzKSB7XG4gICAgICAgICAgaWYodGhpcy5oYXNPd25Qcm9wZXJ0eShhdHRyKSAmJiAoZ2VvbUF0dHJzLmluZGV4T2YoYXR0cikgPT09IC0xKSAmJiAocGFyYW1zLmV4Y2x1ZGUuaW5kZXhPZihhdHRyKSA9PT0gLTEpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzW2F0dHJdID0gdGhpc1thdHRyXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHByb3BlcnRpZXMgPSB7fTtcblxuICAgICAgZnVuYy5jYWxsKHRoaXMsIHByb3BlcnRpZXMpO1xuXG4gICAgICBpZihwYXJhbXMuZXh0cmEpIHsgYWRkRXh0cmEocHJvcGVydGllcywgcGFyYW1zLmV4dHJhKTsgfVxuICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEFkZHMgZGF0YSBjb250YWluZWQgaW4gdGhlIGBleHRyYWBcbiAgLy8gcGFyYW1ldGVyIGlmIGl0IGhhcyBiZWVuIHNwZWNpZmllZFxuICBmdW5jdGlvbiBhZGRFeHRyYShwcm9wZXJ0aWVzLCBleHRyYSkge1xuICAgIGZvcih2YXIga2V5IGluIGV4dHJhKXtcbiAgICAgIGlmKGV4dHJhLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgcHJvcGVydGllc1trZXldID0gZXh0cmFba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJvcGVydGllcztcbiAgfVxuXG59KHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgPyBtb2R1bGUuZXhwb3J0cyA6IHdpbmRvdy5HZW9KU09OID0ge30pKTtcbiIsIlxyXG52YXIgcGF0aCA9IFwiXCI7XHJcblxyXG52YXIgc2hvd1BhcmtpbmcgPSBmYWxzZTtcclxudmFyIHNob3dCaWtld2F5cyA9IGZhbHNlO1xyXG52YXIgc2hvd1NvQmlIdWJzID0gZmFsc2U7XHJcbnZhciBzaG93RnJpZW5kcyA9IGZhbHNlO1xyXG5cclxuZnVuY3Rpb24gYWRkTGF5ZXJUb01hcCAodHlwZSkge1xyXG4gIC8vIEZsaXAgdGhlIGJvb2xlYW4gdmFsdWUgb2YgdGhlIHBhdGhcclxuICBpZiAodHlwZSA9PT0gMSkge1xyXG4gICAgc2hvd1BhcmtpbmcgPSAhc2hvd1Bhcmtpbmc7XHJcbiAgfSBlbHNlIGlmICh0eXBlID09PSAyKSB7XHJcbiAgICBzaG93QmlrZXdheXMgPSAhc2hvd0Jpa2V3YXlzO1xyXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gMykge1xyXG4gICAgc2hvd1NvQmlIdWJzID0gIXNob3dTb0JpSHVicztcclxuICB9IGVsc2UgaWYgKHR5cGUgPT09IDQpIHtcclxuICAgIHNob3dGcmllbmRzID0gIXNob3dGcmllbmRzO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNob3dQYXJraW5nID09PSB0cnVlKSB7XHJcbiAgICAvLyBDYXNlIDEgLSBBZGQgUGFya2luZyBseWVyXHJcbiAgICBwYXRoID0gYnVpbGRPcGVuSGFtUGFya2luZ1BhdGgoKTtcclxuICAgIG1hcC5kYXRhLmxvYWRHZW9Kc29uKHBhdGgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNob3dCaWtld2F5cyA9PT0gdHJ1ZSkge1xyXG4gICAgLy8gQ2FzZSAyIC0gQWRkIEJpa2UgUGF0aHMgTGF5ZXJcclxuICAgIHBhdGggPSBidWlsZE9wZW5IYW1CaWtld2F5UGF0aCgpO1xyXG4gICAgbWFwLmRhdGEubG9hZEdlb0pzb24ocGF0aCk7XHJcbiAgfVxyXG5cclxuICBpZiAoc2hvd1NvQmlIdWJzID09PSB0cnVlKSB7XHJcbiAgICAvLyBDYXNlIDMgLSBBZGQgU29jaWFsIEJpa2UgSHVicyBMYXllclxyXG4gICAgcGF0aCA9IGJ1aWxkT3BlbkhhbVNvQmlIdWJzUGF0aCgpO1xyXG4gICAgbWFwLmRhdGEubG9hZEdlb0pzb24ocGF0aCk7XHJcbiAgfVxyXG5cclxuICBpZiAoc2hvd0ZyaWVuZHMgPT09IHRydWUpIHtcclxuICAgIC8vIENhc2UgNCAtIFNob3cgRnJpZW5kcyBvbiBNYXBcclxuICAgIC8vIFRPRE86IFNldCBCaXRtb2ppcyBhcyBwb2ludHNcclxuICAgIG1hcC5kYXRhLmFkZEdlb0pzb24oZ2V0RnJpZW5kc0xheWVyKCkpO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbi8vIFRoaXMgZnVuY3Rpb24gYnVpbGRzIGFuZCByZXR1cm5zIGEgLmdlb2pzb24gZmlsZSBmcm9tIHlvdXIgZnJpZW5kJ3MgZ2VvcG9pbnRzXHJcbmZ1bmN0aW9uIGdldEZyaWVuZHNMYXllciAoKSB7XHJcbiAgXHJcbiAgdmFyIEdlb0pTT04gPSByZXF1aXJlKCdnZW9qc29uJyk7XHJcbiAgdmFyIGRhdGEgPSBidWlsZERhdGFGaWxlcygpO1xyXG4gIHJldHVybiBHZW9KU09OLnBhcnNlKGRhdGEsIHtQb2ludDogWydsYXQnLCAnbG5nJ10sIGluY2x1ZGU6IFsnbmFtZSddfSk7XHJcbn1cclxuXHJcbi8vIFRoaXMgbWV0aG9kIGJ1aWxkcyBhIGRhdGEgYXJyYXkgYW5kIHJldHVybnMgaXRcclxuZnVuY3Rpb24gYnVpbGREYXRhRmlsZXMgKCkge1xyXG4gIHZhciBkYXRhID0gW1xyXG4gIHsgbmFtZTogJ1NtWXVuZycsIGNhdGVnb3J5OiAnU3RvcmUnLCBzdHJlZXQ6ICdNYXJrZXQnLCBsYXQ6IDQyLjI4NCwgbG5nOiAtNzkuODQzIH0sXHJcbiAgeyBuYW1lOiAnSm9obicsIGNhdGVnb3J5OiAnSG91c2UnLCBzdHJlZXQ6ICdCcm9hZCcsIGxhdDogNDIuMTI0LCBsbmc6IC03OS42MzMgfSxcclxuICB7IG5hbWU6ICdBbGV4JywgY2F0ZWdvcnk6ICdPZmZpY2UnLCBzdHJlZXQ6ICdTb3V0aCcsIGxhdDogNDIuMTIzLCBsbmc6IC03OS4wMzQgfVxyXG4gIF07XHJcbiAgcmV0dXJuIGRhdGE7XHJcbn1cclxuXHJcbi8vIEhhbWlsdG9uIE9wZW4gRGF0YSBQYXRoIEJ1aWxkZXIgZm9yIFNvQmkgSHVicyAoR2VvSlNPTilcclxuZnVuY3Rpb24gYnVpbGRPcGVuSGFtU29CaUh1YnNQYXRoICgpIHtcclxuICByZXR1cm4gXCJodHRwczovL29wZW5kYXRhLmFyY2dpcy5jb20vZGF0YXNldHMvYjVmYjFjMmNiY2NjNDUxM2FkNGNhYzM2NzE5MDVjY2NfMTguZ2VvanNvblwiO1xyXG59XHJcblxyXG4vLyBIYW1pbHRvbiBPcGVuIERhdGEgUGF0aCBCdWlsZGVyIGZvciBCaWtld2F5cyAoR2VvSlNPTilcclxuZnVuY3Rpb24gYnVpbGRPcGVuSGFtQmlrZXdheVBhdGggKCkge1xyXG4gIHJldHVybiBcImh0dHBzOi8vb3BlbmRhdGEuYXJjZ2lzLmNvbS9kYXRhc2V0cy81NDQxNzBiNWIxYmU0MzU1OTJiMWFlYTAxNDI2NWM3ZF83Lmdlb2pzb25cIjtcclxufVxyXG5cclxuLy8gSGFtaWx0b24gT3BlbiBEYXRhIFBhdGggQnVpbGRlciBmb3IgUGFya2luZyBMb3RzIChHZW9KU09OKVxyXG5mdW5jdGlvbiBidWlsZE9wZW5IYW1QYXJraW5nUGF0aCAoKSB7XHJcbiAgcmV0dXJuIFwiaHR0cHM6Ly9vcGVuZGF0YS5hcmNnaXMuY29tL2RhdGFzZXRzL2Q1NmQ5OTZkNDcyNTQ5OWRhMmE1NTU1YWE1ZTViNjUxXzUuZ2VvanNvblwiO1xyXG59XHJcblxyXG4vLyBHb29nbGUgTWFwcyBBUEkgUGF0aCBCdWlsZGVyXHJcbmZ1bmN0aW9uIGJ1aWxkR29vZ2xlTWFwc1BhdGggKCkge1xyXG4gIHJldHVybiBcImh0dHBzOi8vbWFwcy5nb29nbGVhcGlzLmNvbS9tYXBzL2FwaS9qcz9rZXk9QUl6YVN5QUxIWFhQM2RDaVhvbkN6aGxmSXdoSUxQYnBGQW1mUUU0JmNhbGxiYWNrPWluaXRNYXBcIjtcclxufVxyXG4iXX0=

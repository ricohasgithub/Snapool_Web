'use strict';

snapoolweb.prototype.addUser = function(data) {
  var collection = firebase.firestore().collection('user');
  return collection.add(data);
};

snapoolweb.prototype.addUsername = function(id) {
  var collection = firebase.firestore().collection('user');
  var user = collection.doc();
  
};

snapoolweb.prototype.addUserFriends = function(id, data) {
  var user = firebase.firestore.collection('user');
  var document = collection.doc(id);

};

'use strict';

snapoolweb.prototype.addUser = function(data) {
  var collection = firebase.firestore().collection('user');
  return collection.add(data);
};

snapoolweb.prototype.addUsernameToUser = function(id) {
  var user = firebase.firestore().collection('user');
  user.doc('username').set({
    username: id
  });
};

snapoolweb.prototype.addUserFriends = function(id, data) {
  var user = firebase.firestore.collection('user');
  var document = collection.doc(id);

};


'use strict';

snapoolweb.prototype.addUser = function(data) {
  var collection = firebase.firestore().collection('user');
  return collection.add(data);
};

snapoolweb.prototype.getUser = function(id) {
  return firebase.firestore().collection('user').doc(id).get();
};

snapoolweb.prototype.getUsername = function(id) {
  return firebase.firestore().collection('user').doc(id).get('username');
};

snapoolweb.prototype.getFriends = function(id) {
  return firebase.firestore().collection('user').dic(id).get('friends');
};

snapoolweb.prototype.addUsernameToUser = function(id) {
  var user = firebase.firestore().collection('user');
  user.doc().set({
    username: id

  });
};

snapoolweb.prototype.addUserFriends = function(id, data) {
  var user = firebase.firestore.collection('user');
  var document = collection.doc(id);

};


'use strict';

Snapool_Web.prototype.addUser = function(data) {
  var collection = firebase.firestore().collection('user');
  return collection.add(data);
};

Snapool_Web.prototype.getUser = function(id) {
  return firebase.firestore().collection('user').doc(id).get();
};

Snapool_Web.prototype.getUsername = function(id) {
  return firebase.firestore().collection('user').doc(id).get('username');
};

Snapool_Web.prototype.getFriends = function(id) {
  return firebase.firestore().collection('user').dic(id).get('friends');
};

Snapool_Web.prototype.addUsernameToUser = function(id) {
  var user = firebase.firestore().collection('user');
  user.doc().set({
    username: id

  });
};

Snapool_Web.prototype.addUserFriends = function(id, friendID) {
  var friendsList = firebase.firestore.collection('user').doc(id).get(friends);
  return friendsList.add();
};

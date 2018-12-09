
'use strict';

// Constructor
function snapoolweb () {

}


const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

firebase.initializeApp({
  apiKey: 'AIzaSyA3U4uDMhOJf7e-HzAowbkV_z0ziJqzS9c',
  authDomain: 'snapoolweb.firebaseapp.com',
  projectId: 'snapoolweb'
});

// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

function addUser (userId, friendsArray, reqArray) {
  db.collection("users").add({
      username: userId,
      friends: friendsArray,
      hasRequest: reqArray
  })
  .then(function(docRef) {
      console.log("Document written with ID: ", docRef.id);
  })
  .catch(function(error) {
      console.error("Error adding document: ", error);
  });
}

window.onload = function() {
  window.app = new snapoolweb();
};

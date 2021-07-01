import firebase from 'firebase/app';
import 'firebase/auth';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDgdBnNS3nifOYpspsLEt6LpCLVAZkEPfs",
    authDomain: "speak-95c35.firebaseapp.com",
    projectId: "speak-95c35",
    storageBucket: "speak-95c35.appspot.com",
    messagingSenderId: "454066837998",
    appId: "1:454066837998:web:63eafd6f6c05d6d66256ff",
    measurementId: "G-C2TGX2V2E3"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default firebase;
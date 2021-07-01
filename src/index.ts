import firebase from "./config";
import "firebase/firestore";
import "firebase/storage";
import "firebase/functions";
import "firebase/auth";

// firebase.firestore().useEmulator("localhost", 8080);
// firebase.auth().useEmulator("http://localhost:9099");
// firebase.storage().useEmulator("localhost", 9199);
// firebase.functions().useEmulator("localhost", 5001);

import "./auth";

const requestModal = document.querySelector<HTMLElement>(".new-request");
const requestLink = document.querySelector<HTMLElement>(".add-request");
const requestForm = document.querySelector<HTMLFormElement>(".new-request form");

requestLink!.addEventListener("click", (e: Event) => {
  requestModal!.classList.add("open");
});

// close request modal
requestModal!.addEventListener("click", (e: Event) => {
  if (e.target instanceof HTMLElement && e.target.classList.contains("new-request")) {
    requestModal!.classList.remove("open");
  }
});

// add a new request
requestForm!.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log('submit requestForm');
  var forValue = new FormData(requestForm!);
  const addRequest = firebase.functions().httpsCallable("addRequest");
  addRequest({text: forValue.get("request") as string})
  .then(() => {
    requestForm!.reset();
    requestForm!.querySelector(".error")!.textContent = "";
    requestModal!.classList.remove("open");
  })
  .catch(error => {
    requestForm!.querySelector(".error")!.textContent = error.message;
  });
});

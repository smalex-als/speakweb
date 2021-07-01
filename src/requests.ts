import firebase from "./config";
import Vue from "vue";
import { showNotification } from "./common";

export function initApp() {
  var app = new Vue({
    el: "#app",
    data: {
      requests: [],
    },
    methods: {
      upvoteRequest(id: string) {
        //console.log(id);
        const upvote = firebase.functions().httpsCallable("upvote");
        upvote({ id })
        .catch(error => {
          showNotification(error.message);
          console.log(error.message);
        });
      },
    },
    mounted() {
      const ref = firebase.firestore().collection("requests");

      ref.onSnapshot(snapshot => {
        let requests: any = [];
        snapshot.forEach(doc => {
          requests.push({...doc.data(), id: doc.id});
        });
        this.requests = requests;
      });
    }
  });
}
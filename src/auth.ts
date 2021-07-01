import firebase from "./config";
import "./requests";
import pageStudy from "./pageStudy";

const authSwitchLinks = document.querySelectorAll(".switch");
const authModals = document.querySelectorAll(".auth .modal");
const authWrapper = document.querySelector<HTMLElement>(".auth");
const registerForm = document.querySelector<HTMLFormElement>(".register");
const loginForm = document.querySelector<HTMLFormElement>(".login");
const signOut = document.querySelector(".sign-out");

// toggle auth modals
authSwitchLinks.forEach(link => {
    link.addEventListener("click", () => {
        authModals.forEach(modal => modal.classList.toggle("active"));
    });
});

if (registerForm) {
    // register form
    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(registerForm);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(user => {
                console.log("registered", user);
                registerForm.reset();
            })
            .catch(error => {
                registerForm.querySelector<HTMLElement>(".error")!.textContent = error.message;
            });
    });

}

if (loginForm) {
    // login form
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(loginForm);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(user => {
                console.log("logged in", user);
                loginForm.reset();
            })
            .catch(error => {
                loginForm.querySelector<HTMLElement>(".error")!.textContent = error.message;
            });
    });
}


// sign out
signOut!.addEventListener("click", () => {
    firebase.auth().signOut()
        .then(() => console.log("signed out"));
});

// auth listener
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        authWrapper!.classList.remove("open");
        authModals.forEach(modal => modal.classList.remove("active"));

        let pagePromise: Promise<void>;
        pagePromise = pageStudy.mount();
    } else {
        authWrapper!.classList.add("open");
        authModals[0].classList.add("active");
    }
});
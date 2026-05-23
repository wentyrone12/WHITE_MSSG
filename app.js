// IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// CONFIG (galing sayo)
const firebaseConfig = {
  apiKey: "AIzaSyBQw-3X0a2raGnShlViyN8D7veDlMxCXLI",
  authDomain: "whitemssg.firebaseapp.com",
  databaseURL: "https://whitemssg-default-rtdb.firebaseio.com",
  projectId: "whitemssg",
  storageBucket: "whitemssg.firebasestorage.app",
  messagingSenderId: "757785261412",
  appId: "1:757785261412:web:37974ba59faee1f4baf671",
  measurementId: "G-2K7NCM21PB"
};

// INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// SIGN UP
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const db = getDatabase(app);

window.signUp = async () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const username = document.getElementById("signupUsername").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await sendEmailVerification(userCredential.user);

    // 🔥 SAVE USERNAME SA DATABASE
    await set(ref(db, "users/" + userCredential.user.uid), {
      email: email,
      username: username
    });

    alert("Account created! Verify your email.");
  } catch (error) {
    alert(error.message);
  }
};

// LOGIN
window.login = async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (!userCredential.user.emailVerified) {
      alert("Verify your email first!");
      return;
    }

    // 🔥 SAVE UID SA LOCAL STORAGE
    localStorage.setItem("uid", userCredential.user.uid);

    window.location.href = "dashboard.html";

  } catch (error) {
    alert(error.message);
  }
};

// FORGOT PASSWORD
window.resetPassword = async () => {
  const email = document.getElementById("forgotEmail").value;

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent!");
  } catch (error) {
    alert(error.message);
  }
};

// AUTO LOGIN CHECK
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    console.log("User already logged in");
  }
});
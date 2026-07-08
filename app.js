// IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential
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
import {
  getDatabase,
  ref,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const db = getDatabase(app);

window.signUp = async () => {

  const username = document.getElementById("signupUsername").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (!username) {
    alert("Enter username.");
    return;
  }

  if (!email) {
    alert("Enter email.");
    return;
  }

  if (!password) {
    alert("Enter password.");
    return;
  }

  if (!confirmPassword) {
    alert("Confirm your password.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    await sendEmailVerification(userCredential.user);

    await set(
      ref(db, "users/" + userCredential.user.uid),
      {
        email: email,
        username: username
      }
    );

    alert("Account created successfully!\nPlease verify your email.");

    document.getElementById("signupUsername").value = "";
    document.getElementById("signupEmail").value = "";
    document.getElementById("signupPassword").value = "";
    document.getElementById("signupConfirmPassword").value = "";

    showForm("loginForm");

  } catch (error) {

    alert(error.message);

  }

};

window.changeEmail = async (
  password,
  newEmail
) => {

  const auth = getAuth();

  const user = auth.currentUser;

  if (!user) {
    alert("Login first.");
    return;
  }


  try {

    const credential =
      EmailAuthProvider.credential(
        user.email,
        password
      );

    await reauthenticateWithCredential(
      user,
      credential
    );

    await verifyBeforeUpdateEmail(
      user,
      newEmail
    );

    const db = getDatabase();

    await set(
      ref(db, "users/" + user.uid + "/pendingEmail"),
      newEmail
    );

    alert(
      "Verification email has been sent.\n\n" +
      "Open your new email and verify it.\n" +
      "After verification your login email will automatically become:\n\n" +
      newEmail
    );

  }
  catch (err) {

    if (
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password"
    ) {

      alert("Wrong password.");

      return;

    }

    if (err.code === "auth/email-already-in-use") {

      alert("Email already exists.");

      return;

    }

    alert(err.message);

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

    const snap = await get(
      ref(db, "users/" + userCredential.user.uid)
    );

    if (snap.exists()) {

      const data = snap.val();

      if (data.pendingEmail) {

        await update(
          ref(db, "users/" + userCredential.user.uid),
          {

            email: userCredential.user.email,

            pendingEmail: null,

            emailChangeCooldown:
              Date.now() + 7 * 24 * 60 * 60 * 1000

          }
        );

      }

    }

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



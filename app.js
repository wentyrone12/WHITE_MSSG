import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQw-3X0a2raGnShlViyN8D7veDlMxCXLI",
  authDomain: "whitemssg.firebaseapp.com",
  databaseURL: "https://whitemssg-default-rtdb.firebaseio.com",
  projectId: "whitemssg",
  storageBucket: "whitemssg.firebasestorage.app",
  messagingSenderId: "757785261412",
  appId: "1:757785261412:web:0e87a8ef3a8808a4baf671",
  measurementId: "G-5KDHFZLV1F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, 40);
}

async function makeUniqueUsername(baseName, uid) {
  const base = cleanUsername(baseName) || "WHITE_USER";
  const snap = await get(ref(db, "users"));
  let collision = false;

  snap.forEach(child => {
    const data = child.val() || {};
    if (child.key !== uid && String(data.username || "").toLowerCase() === base.toLowerCase()) {
      collision = true;
    }
  });

  return collision ? `${base}#${uid.slice(0, 4)}` : base;
}

async function ensureGoogleProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap = await get(userRef);
  const existing = snap.exists() ? (snap.val() || {}) : {};
  const fallback = (user.displayName || user.email?.split("@")[0] || "WHITE_USER").trim();
  const username = existing.username || await makeUniqueUsername(fallback, user.uid);

  await update(userRef, {
    email: user.email || existing.email || "",
    username,
    photoURL: user.photoURL || existing.photoURL || "",
    provider: "google",
    searchable: existing.searchable !== false,
    showOnlineStatus: existing.showOnlineStatus !== false,
    online: false,
    lastActiveAt: Date.now()
  });

  return username;
}

async function completeGoogleLogin(user) {
  const username = await ensureGoogleProfile(user);
  localStorage.setItem("uid", user.uid);
  localStorage.setItem("white_mssg_auth_provider", "google");
  localStorage.setItem("white_mssg_username", username);
  window.location.href = "dashboard.html";
}

function showAuthError(error) {
  const messages = {
    "auth/file-protocol": "Open WHITE_MSSG from localhost or your HTTPS/GitHub Pages URL. Google Sign-In cannot run from a file:// page.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
    "auth/popup-blocked": "The Google pop-up was blocked. WHITE_MSSG will try the redirect sign-in flow instead.",
    "auth/operation-not-supported-in-this-environment": "This browser/PWA mode does not support the Google popup. Try the redirect sign-in flow.",
    "auth/web-storage-unsupported": "Browser storage is unavailable. Disable strict/private storage blocking and try again.",
    "auth/unauthorized-domain": "Firebase rejected this website origin. Add the exact hostname you are using (for example: yourname.github.io) under Firebase → Authentication → Settings → Authorized domains.",
    "auth/invalid-api-key": "Firebase rejected the API key. Make sure this app uses the web app configuration from the same whitemssg Firebase project.",
    "auth/app-not-authorized": "This web app is not authorized for Firebase Authentication. Check the Firebase project and web app configuration.",
    "auth/account-exists-with-different-credential": "An account with this email already exists using another sign-in method. Sign in using the original method first.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/cancelled-popup-request": "Another Google sign-in attempt is already running. Finish or close that Google window, then try again."
  };
  alert(messages[error?.code] || error?.message || "Authentication failed.");
}

function isStandalonePWA() {
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function isMobileBrowser() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
}

async function startGoogleAuth(flowLabel = "Sign in") {
  if (window.location.protocol === "file:") {
    const err = new Error("WHITE_MSSG is being opened from file://. Firebase OAuth requires a web origin such as localhost or HTTPS.");
    err.code = "auth/file-protocol";
    showAuthError(err);
    return;
  }

  try {
    // Firebase recommends redirect on mobile because popups are often blocked there.
    if (isMobileBrowser() || isStandalonePWA()) {
      sessionStorage.setItem("white_mssg_google_flow", flowLabel);
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    const result = await signInWithPopup(auth, googleProvider);
    await completeGoogleLogin(result.user);
  } catch (error) {
    console.error(`Google ${flowLabel} failed:`, error);

    // Desktop browsers may block the popup. Falling back to redirect keeps auth usable.
    if (error?.code === "auth/popup-blocked" ||
        error?.code === "auth/operation-not-supported-in-this-environment" ||
        error?.code === "auth/web-storage-unsupported") {
      try {
        sessionStorage.setItem("white_mssg_google_flow", flowLabel);
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        console.error("Google redirect fallback failed:", redirectError);
        showAuthError(redirectError);
        return;
      }
    }

    showAuthError(error);
  }
}

window.signInWithGoogle = () => startGoogleAuth("Sign in");
window.signUpWithGoogle = () => startGoogleAuth("Sign up");

window.signUp = async () => {
  const username = document.getElementById("signupUsername").value.trim();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (!username) return alert("Enter username.");
  if (!email) return alert("Enter email.");
  if (!password) return alert("Enter password.");
  if (!confirmPassword) return alert("Confirm your password.");
  if (password !== confirmPassword) return alert("Passwords do not match.");
  if (password.length < 6) return alert("Password must be at least 6 characters.");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);

    await set(ref(db, `users/${userCredential.user.uid}`), {
      email,
      username: cleanUsername(username),
      provider: "password",
      searchable: true,
      showOnlineStatus: true,
      online: false,
      lastActiveAt: Date.now()
    });

    // Explicitly sign out after registration so the page never silently enters the dashboard.
    await signOut(auth);
    localStorage.removeItem("uid");
    localStorage.removeItem("white_mssg_auth_provider");
    localStorage.removeItem("white_mssg_username");

    alert("Account created successfully!\nPlease verify your email before signing in.");
    document.getElementById("signupUsername").value = "";
    document.getElementById("signupEmail").value = "";
    document.getElementById("signupPassword").value = "";
    document.getElementById("signupConfirmPassword").value = "";
    showForm("loginForm");
  } catch (error) {
    showAuthError(error);
  }
};

window.login = async () => {
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  if (!email || !password) return alert("Enter your email and password.");

  const attemptKey = "white_login_security_" + email;
  const now = Date.now();
  let guard = {};
  try { guard = JSON.parse(localStorage.getItem(attemptKey) || "{}"); } catch (_) {}

  if (guard.lockUntil && now < guard.lockUntil) {
    const hours = Math.ceil((guard.lockUntil - now) / 3600000);
    return alert(`Account temporarily held. Try again in about ${hours} hour(s).`);
  }
  if (guard.lockUntil && now >= guard.lockUntil) {
    guard = { attempts: 0, lockUntil: 0 };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    localStorage.removeItem(attemptKey);

    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      return alert("Verify your email first. Check your inbox for the verification link.");
    }

    localStorage.setItem("uid", userCredential.user.uid);
    localStorage.setItem("white_mssg_auth_provider", "password");

    const snap = await get(ref(db, `users/${userCredential.user.uid}`));
    if (snap.exists()) {
      const data = snap.val() || {};
      const patch = {
        email: userCredential.user.email,
        searchable: data.searchable !== false,
        showOnlineStatus: data.showOnlineStatus !== false
      };

      if (data.pendingEmail) {
        patch.email = userCredential.user.email;
        patch.pendingEmail = null;
        patch.emailChangeCooldown = Date.now() + 7 * 24 * 60 * 60 * 1000;
      }

      await update(ref(db, `users/${userCredential.user.uid}`), patch);
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    guard.attempts = (guard.attempts || 0) + 1;
    if (guard.attempts >= 4) {
      guard = { attempts: 4, lockUntil: Date.now() + 24 * 60 * 60 * 1000 };
      localStorage.setItem(attemptKey, JSON.stringify(guard));
      alert("4 failed login attempts. This browser is locked for 24 hours.");
    } else {
      localStorage.setItem(attemptKey, JSON.stringify(guard));
      alert(`Incorrect login details. ${4 - guard.attempts} attempt(s) remaining.`);
    }
  }
};

window.resetPassword = async () => {
  const email = document.getElementById("forgotEmail").value.trim().toLowerCase();
  if (!email) return alert("Enter your email first.");

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent. Please check your inbox and spam folder.");
  } catch (error) {
    showAuthError(error);
  }
};

window.changeEmail = async (password, newEmail) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login first.");

  const providerIds = (user.providerData || []).map(p => p.providerId);

  if (providerIds.includes("password")) {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } else if (providerIds.includes("google.com")) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await reauthenticateWithPopup(user, provider);
  }

  await verifyBeforeUpdateEmail(user, newEmail);

  await update(ref(db, `users/${user.uid}`), {
    pendingEmail: newEmail
  });

  alert(
    "Verification email sent.\n\n" +
    "Open the message sent to the new email address and verify it. " +
    "Your login email will update after verification."
  );
};

window.changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Login first.");

  const providerIds = (user.providerData || []).map(p => p.providerId);

  if (!providerIds.includes("password")) {
    throw new Error("This account uses Google Sign-In. Manage the password from your Google account.");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);

  await update(ref(db, `users/${user.uid}`), {
    passwordChangedAt: Date.now(),
    provider: "password"
  });
};

window.logoutUser = async () => {
  try {
    if (window.setOnlineStatus) await window.setOnlineStatus(false);
  } catch (_) {}

  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Sign-out error:", error);
  }

  localStorage.removeItem("uid");
  localStorage.removeItem("white_mssg_auth_provider");
  localStorage.removeItem("white_mssg_username");
  window.location.href = "index.html";
};

// Complete Google redirect sign-ins after the browser returns from Google.
// This is also what makes Google auth work more reliably in installed PWAs/mobile browsers.
getRedirectResult(auth)
  .then(async (result) => {
    if (!result?.user) return;
    sessionStorage.removeItem("white_mssg_google_flow");
    await completeGoogleLogin(result.user);
  })
  .catch((error) => {
    console.error("Google redirect result failed:", error);
    sessionStorage.removeItem("white_mssg_google_flow");
    showAuthError(error);
  });

// Do not auto-redirect when Firebase restores an existing session.
// Navigation into the app remains an explicit user action.
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.body.dataset.authenticated = "true";
  } else {
    delete document.body.dataset.authenticated;
  }
});

document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", e => {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "J") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }
});

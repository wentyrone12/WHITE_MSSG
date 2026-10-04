# WHITE_MSSG

WHITE_MSSG now includes Progressive Web App (PWA) support.

## Install on Android / Chrome
1. Host the project on HTTPS (for example GitHub Pages, Firebase Hosting, or another HTTPS host).
2. Open `index.html` through the hosted HTTPS URL.
3. Use the WHITE_MSSG install prompt or the browser menu → Install app / Add to Home screen.

## Install on iPhone / iPad
Open the HTTPS site in Safari → Share → Add to Home Screen.

## Important
Firebase Authentication and Realtime Database continue to use the network. The service worker only caches the local app shell so it does not interfere with Firebase requests.


## WHITE_MSSG Enhancement Pack

This version includes:
- Google Sign-In on the Login screen.
- Google Sign-Up on the Create Account screen.
- No automatic dashboard redirect from Firebase session restoration; dashboard entry remains explicit.
- 6 separate PIN boxes for inbox unlock.
- 6 separate PIN boxes for Current / New / Confirm PIN in Settings.
- PIN auto-advance, backspace navigation, and 6-digit paste support.
- Expanded Settings with Profile, Account, Security, Privacy & Presence, and App sections.
- Functional Show Active Status toggle.
- Functional Searchable Profile toggle: when disabled and saved, the username is excluded from the user-search flow.
- Firebase Authentication-based password change instead of comparing/storing a password in Realtime Database.
- Fixed online-status writes so they update `users/{uid}` instead of accidentally overwriting a `users/{username}` path.
- Firebase `onDisconnect()` presence handling.
- Google profile data synchronization for username, email, and profile photo.

### Firebase Google Sign-In
In Firebase Console:
1. Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorized domains → add the domain where WHITE_MSSG is hosted.
3. For local testing, `localhost` / `127.0.0.1` must be handled according to Firebase Authentication's current authorized-domain requirements.
4. Open `index.html` over HTTP/HTTPS rather than relying on `file://` for Firebase Authentication.

The app uses the supplied `whitemssg` Firebase project configuration.

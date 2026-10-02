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

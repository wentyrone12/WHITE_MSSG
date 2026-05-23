// 🔥 Firebase config (DI GINALAW)
const firebaseConfig = {
  apiKey: "AIzaSyBQw-3X0a2raGnShlViyN8D7veDlMxCXLI",
  authDomain: "whitemssg.firebaseapp.com",
  databaseURL: "https://whitemssg-default-rtdb.firebaseio.com",
  projectId: "whitemssg",
  storageBucket: "whitemssg.appspot.com",
  messagingSenderId: "757785261412",
  appId: "1:757785261412:web:37974ba59faee1f4baf671",
};


autoSaveProfile();

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentRequest = null;

let username = "";
let currentChat = "";

const uid = localStorage.getItem("uid");

if (!uid) {
    alert("Not logged in!");
    window.location.href = "index.html";
}

// ✅ NOW WORKING
db.ref("users/" + uid).once("value", snap => {
    const data = snap.val();

    if (!data) {
        alert("User not found!");
        return;
    }

    username = data.username;

    document.getElementById("chat").classList.remove("hidden");
    document.getElementById("userDisplay").innerText = username;

    setOnlineStatus(true);
    loadChatList();
    loadPublicMessages();
});

// LOGIN
function login() {
    username = document.getElementById("username").value.trim();
    if (!username) return alert("Enter username!");

    document.getElementById("login").style.display = "none";
    document.getElementById("chat").classList.remove("hidden");

    document.getElementById("userDisplay").innerText = username;

    setOnlineStatus(true);
    loadChatList(); // 🔥 load inbox
}

// ONLINE STATUS
function setOnlineStatus(status) {
    db.ref("users/" + username).set({
        online: status
    });
}

// SIDEBAR TOGGLE
function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("active");
}

function togglePublicChat(){
    const el = document.getElementById("pubchat-info");

    if (el.classList.contains("active")) {
        // CLOSE
        el.classList.remove("active");

        setTimeout(() => {
            el.classList.add("hidden");
        }, 300); // wait animation
    } else {
        // OPEN
        el.classList.remove("hidden");

        setTimeout(() => {
            el.classList.add("active");
        }, 10);
    }
}


// START CHAT
function startChat() {
    const target = document.getElementById("targetUser").value.trim();
    if (!target) return;

    currentChat = [username, target].sort().join("_");

    document.getElementById("chatWith").innerText = "Chat with: " + target;

    loadMessages();
    listenStatus(target);
}

// SEND MESSAGE
function sendMessage() {
    const msg = document.getElementById("messageInput").value.trim();
    if (!msg || !currentChat) return;

    db.ref("chats/" + currentChat).push({
        user: username,
        text: msg
    });

    document.getElementById("messageInput").value = "";
}

// LOAD MESSAGES
function loadMessages() {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";

    db.ref("chats/" + currentChat).off();

    db.ref("chats/" + currentChat).on("child_added", snap => {
        const data = snap.val();

        const div = document.createElement("div");
        div.classList.add("message");

        if (data.user === username) {
            div.classList.add("me");
        } else {
            div.classList.add("other");
        }

        div.innerText = data.text;

        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// LOAD CHAT LIST (INBOX)
function loadChatList() {
    const chatListDiv = document.getElementById("chatList");

    db.ref("chats").on("value", snapshot => {
        chatListDiv.innerHTML = "";

        snapshot.forEach(chat => {
            const chatKey = chat.key;

            if (chatKey.includes(username)) {
                const users = chatKey.split("_");
                const otherUser = users[0] === username ? users[1] : users[0];

                const div = document.createElement("div");
                div.classList.add("chat-item");
                div.innerText = otherUser;

                div.onclick = () => {
                    currentChat = chatKey;

                    document.getElementById("chatWith").innerText =
                        "Chat with: " + otherUser;

                    loadMessages();
                    listenStatus(otherUser);
                    toggleSidebar();
                };

                chatListDiv.appendChild(div);
            }
        });
    });

    // ✅ HIWALAY NA LISTENER
    db.ref("messageRequests/" + uid).on("value", snapshot => {
    snapshot.forEach(req => {
            const data = req.val();

            const div = document.createElement("div");
            div.classList.add("chat-item");
            div.innerText = "📩 " + data.fromUsername;

            div.onclick = () => {
                showRequest(data, req.key);
            };
            chatListDiv.appendChild(div);
        });
    });
}

// STATUS
function listenStatus(target) {
    db.ref("users/" + target).on("value", snap => {
        const data = snap.val();
        document.getElementById("status").innerText =
            data && data.online ? "🟢 Online" : "⚪ Offline";
    });
}

// AUTO OFFLINE
window.addEventListener("beforeunload", () => {
    if (username) setOnlineStatus(false);
});

function sendPublicMessage() {
    const msg = document.getElementById("pubInput").value.trim();
    if (!msg) return;

    db.ref("publicChat").push({
        user: username,
        text: msg
    });

    document.getElementById("pubInput").value = "";
}

function loadPublicMessages() {
    const container = document.getElementById("pubMessages");

    db.ref("publicChat").on("child_added", snap => {
        const data = snap.val();

        const div = document.createElement("div");
        div.classList.add("message");

        // 🔥 CHECK KUNG IKAW
        if (data.user === username) {
            div.classList.add("me");
        } else {
            div.classList.add("other");
        }

        // 🔥 CREATE USERNAME (CLICKABLE)
        const name = document.createElement("strong");
        name.innerText = data.user;
        name.style.cursor = "pointer";

        // 🔥 CLICK TO CHAT
        name.onclick = () => {
            openProfile(data.user);
        };

        // 🔥 MESSAGE TEXT
        const text = document.createElement("div");
        text.innerText = data.text;

        div.appendChild(name);
        div.appendChild(text);

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    });
}


function startChatFromPublic(targetUser){
    if (targetUser === username) return; // wag sarili

    currentChat = [username, targetUser].sort().join("_");

    document.getElementById("chatWith").innerText =
        "Chat with: " + targetUser;

    loadMessages();
    listenStatus(targetUser);

    // 🔥 OPTIONAL: close public chat
    togglePublicChat();
}

function pinMessage(text) {
    if (!currentChat) return;

    db.ref("chats/" + currentChat + "/pinned").set({
        text: text,
        by: username
    });
}

function openProfile(targetUser){
    const overlay = document.getElementById("profileOverlay");

    getUIDByUsername(targetUser, (uidFound) => {

        if (!uidFound){
            alert("User not found!");
            return;
        }

        db.ref("messageRequests/" + uid + "/" + currentProfileUser).once("value", snap => {

    const data = snap.val();

    if (data && data.cooldownUntil && Date.now() < data.cooldownUntil) {
        startCooldownUI(data.cooldownUntil);
    } else {
        resetMessageBox();
    }
});

        db.ref("users/" + uidFound).once("value", snap => {
            const data = snap.val();

            currentProfileUser = uidFound;

            // ✅ DEFINE FIRST (IMPORTANT)
            const isMe = uidFound === uid;

            // ✅ SET DATA
            document.getElementById("profileName").innerText =
                data.username || targetUser;

            document.getElementById("profileAge").innerText =
                "Age: " + (data.age || "N/A");

            document.getElementById("profileBio").innerText =
                data.bio || "No bio yet";

            document.getElementById("profileAgeInput").value =
                data.age || "";

            document.getElementById("profileBioInput").value =
                data.bio || "";

            // ✅ BUTTON CONTROL (AFTER isMe)
            document.getElementById("addFriendBtn").style.display =
                isMe ? "none" : "inline-block";

            document.getElementById("messageUserBtn").style.display =
                isMe ? "none" : "inline-block";

            document.querySelector(".edit-profile-btn").style.display =
                isMe ? "inline-block" : "none";

            document.querySelector(".save-profile-btn").style.display =
                isMe ? "inline-block" : "none";

            // ✅ RESET MESSAGE BOX
            document.getElementById("messageBox").classList.add("hidden");

            // ✅ STALK MODE
            if (!isMe){
                document.getElementById("profileAgeInput").classList.add("hidden");
                document.getElementById("profileBioInput").classList.add("hidden");
            }

            overlay.classList.remove("hidden");

            setTimeout(() => {
                overlay.classList.add("active");
            }, 10);
        });

    });

    function resetMessageBox(){
    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    btn.disabled = false;
    btn.style.opacity = "1";
    btn.innerText = "Send";

    textarea.disabled = false;
    textarea.style.opacity = "1";
    textarea.value = "";
}

resetMessageBox();
}

function closeProfile(){
    const overlay = document.getElementById("profileOverlay");

    overlay.classList.remove("active");

    setTimeout(()=>{
        overlay.classList.add("hidden");

        // 🔥 reset UI
        document.getElementById("messageUserBtn").style.display = "inline-block";
        document.getElementById("addFriendBtn").style.display = "inline-block";
        document.getElementById("messageBox").classList.add("hidden");

    },300);
}

function openMyProfile(){
    if (!username) return;

    openProfile(username);
}

let currentProfileUser = "";


function enableEditProfile(){

    // SHOW INPUTS
    document.getElementById("profileAgeInput").classList.remove("hidden");
    document.getElementById("profileBioInput").classList.remove("hidden");

    // HIDE TEXT
    document.getElementById("profileAge").classList.add("hidden");
    document.getElementById("profileBio").classList.add("hidden");

    // HIDE EDIT BUTTON
    document.querySelector(".edit-profile-btn").classList.add("hidden");

    // SHOW SAVE BUTTON
    document.querySelector(".save-profile-btn").classList.remove("hidden");
}

function saveProfile(){

    const newAge = document.getElementById("profileAgeInput").value;
    const newBio = document.getElementById("profileBioInput").value;

    db.ref("users/" + currentProfileUser).update({
        age: newAge,
        bio: newBio
    });

    document.getElementById("profileAge").innerText =
        "Age: " + newAge;

    document.getElementById("profileBio").innerText =
        newBio;

    document.getElementById("profileAge").classList.remove("hidden");
    document.getElementById("profileBio").classList.remove("hidden");

    document.getElementById("profileAgeInput").classList.add("hidden");
    document.getElementById("profileBioInput").classList.add("hidden");

    document.querySelector(".save-profile-btn").classList.add("hidden");

    document.querySelector(".save-profile-btn").classList.add("hidden");

document.querySelector(".edit-profile-btn").classList.remove("hidden");
}

function autoSaveProfile() {
    const ageInput = document.getElementById("profileAgeInput");
    const bioInput = document.getElementById("profileBioInput");

    ageInput.oninput = () => {
        if (!currentProfileUser) return;

        db.ref("users/" + currentProfileUser).update({
            age: ageInput.value
        });
    };

    bioInput.oninput = () => {
        if (!currentProfileUser) return;

        db.ref("users/" + currentProfileUser).update({
            bio: bioInput.value
        });
    };
}

function openMessageBox(){

    // 🔥 hide buttons
    document.getElementById("messageUserBtn").style.display = "none";
    document.getElementById("addFriendBtn").style.display = "none";

    // 🔥 show message box
    const box = document.getElementById("messageBox");
    box.classList.remove("hidden");

    // 🔥 OPTIONAL: scroll sa baba ng card
    box.scrollIntoView({ behavior: "smooth" });
}


function getUIDByUsername(targetUsername, callback){
    db.ref("users").once("value", snapshot => {
        let foundUID = null;

        snapshot.forEach(user => {
            const data = user.val();
            if (data.username === targetUsername){
                foundUID = user.key;
            }
        });

        callback(foundUID);
    });
}

function addFriend(){
    if (!currentProfileUser || currentProfileUser === uid) return;

    db.ref("friendRequests/" + currentProfileUser + "/" + uid).set({
        from: uid,
        username: username
    });

    alert("Friend request sent!");
}

function sendMessageRequest(){
    const msg = document.getElementById("requestMessage").value.trim();
    if (!msg || !currentProfileUser) return;

    const ref = db.ref("messageRequests/" + currentProfileUser + "/" + uid);

    ref.once("value", snap => {

        const data = snap.val();

        // 🔥 IF EXISTS AND STILL IN COOLDOWN
        if (data && data.cooldownUntil && Date.now() < data.cooldownUntil) {
            startCooldownUI(data.cooldownUntil);
            return;
        }

        const now = Date.now();
        const cooldown = now + (24 * 60 * 60 * 1000); // 24 hours

        ref.set({
            fromUID: uid,
            fromUsername: username,
            message: msg,
            sentAt: now,
            cooldownUntil: cooldown
        });

        document.getElementById("requestMessage").value = "";

        startCooldownUI(cooldown);

        alert("Message request sent!");
    });
}

let cooldownInterval = null;

function startCooldownUI(cooldownUntil){

    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    btn.disabled = true;
    textarea.disabled = true;

    btn.style.opacity = "0.4";
    textarea.style.opacity = "0.6";

    btn.innerText = "Wait 24h";

    if (cooldownInterval) clearInterval(cooldownInterval);

    cooldownInterval = setInterval(() => {

        const now = Date.now();
        const remaining = cooldownUntil - now;

        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            resetMessageBox();
            return;
        }

        const hrs = Math.floor(remaining / (1000 * 60 * 60));
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remaining % (1000 * 60)) / 1000);

        btn.innerText = `Wait ${hrs}h ${mins}m ${secs}s`;

    }, 1000);
}

function disableMessageBox(){

    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    // disable send button
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.innerText = "Sent";

    // disable typing (but keep visible)
    textarea.disabled = true;
    textarea.style.opacity = "0.6";
}

function acceptMessageRequest(senderName, senderUID){

    currentChat = [username, senderName].sort().join("_");

    document.getElementById("chatWith").innerText =
        "Chat with: " + senderName;

    loadMessages();
    listenStatus(senderName);

    // delete request after accept
    db.ref("messageRequests/" + uid).remove();
}

function resetMessageBox(){

    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    btn.disabled = false;
    textarea.disabled = false;

    btn.style.opacity = "1";
    textarea.style.opacity = "1";

    btn.innerText = "Send";

    if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
    }
}

function showRequest(data, requestKey){
    currentRequest = {
        key: requestKey,
        fromUID: data.fromUID,
        fromUsername: data.fromUsername
    };

    document.getElementById("requestFrom").innerText =
        "From: " + data.fromUsername;

    document.getElementById("requestText").innerText =
        data.message;

    // SHOW OVERLAY
    document.getElementById("requestOverlay").classList.remove("hidden");
}

function acceptRequest(){
    if (!currentRequest) return;

    currentChat = [username, currentRequest.fromUsername].sort().join("_");

    document.getElementById("chatWith").innerText =
        "Chat with: " + currentRequest.fromUsername;

    loadMessages();
    listenStatus(currentRequest.fromUsername);

    db.ref("messageRequests/" + uid + "/" + currentRequest.key).remove();

    document.getElementById("requestOverlay").classList.add("hidden");

    currentRequest = null;
}

function declineRequest(){
    if (!currentRequest) return;

    db.ref("messageRequests/" + uid + "/" + currentRequest.key).remove();

    document.getElementById("requestOverlay").classList.add("hidden");

    currentRequest = null;
}

document.addEventListener("keydown", function(e){
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "J") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
    alert("Inspect is disabled!");
  }
});

document.addEventListener("contextmenu", function(e){
  e.preventDefault();
});
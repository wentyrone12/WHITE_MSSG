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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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

                    toggleSidebar(); // auto close
                };

                chatListDiv.appendChild(div);
            }
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
            startChatFromPublic(data.user);
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
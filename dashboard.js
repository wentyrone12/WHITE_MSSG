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

let currentRequest = null;

let username = "";
let currentChat = "";
let inboxUnlocked = false;


function showCategory(type) {

    if (!inboxUnlocked) {
        document.getElementById("sidebarContent").classList.add("hidden");
        document.getElementById("sidebarLock").style.display = "flex";
        return;
    }

    document.getElementById("sidebarLock").style.display = "none";
    document.getElementById("sidebarContent").classList.remove("hidden");

    document.getElementById("chatCategory").classList.add("hidden");
    document.getElementById("requestCategory").classList.add("hidden");

    document.querySelectorAll(".category-btn")
        .forEach(btn => btn.classList.remove("active"));

    if (type === "chat") {
        document.getElementById("chatCategory").classList.remove("hidden");
        document.querySelectorAll(".category-btn")[0].classList.add("active");
    }

    if (type === "request") {
        document.getElementById("requestCategory").classList.remove("hidden");
        document.querySelectorAll(".category-btn")[1].classList.add("active");
    }

}

const uid = localStorage.getItem("uid");

if (!uid) {
    alert("Not logged in!");
    window.location.href = "index.html";
}

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
    showCategory("chat");
    loadPublicMessages();
});


function login() {
    username = document.getElementById("username").value.trim();
    if (!username) return alert("Enter username!");

    document.getElementById("login").style.display = "none";
    document.getElementById("chat").classList.remove("hidden");

    document.getElementById("userDisplay").innerText = username;

    setOnlineStatus(true);

    updateSecurityUI(false);
}

function openChats() {

    showCategory("chat");

}


function setOnlineStatus(status) {
    db.ref("users/" + username).set({
        online: status
    });
}

// SIDEBAR TOGGLE
function toggleSidebar() {

    const sidebar = document.getElementById("sidebar");

    sidebar.classList.toggle("active");

    if (sidebar.classList.contains("active") && !inboxUnlocked) {

        openPinOverlay();

    }

}

function openPinOverlay() {

    const input = document.getElementById("pinInput");

    input.value = "";

    document.getElementById("sidebarLock").style.display = "flex";

    setTimeout(() => {

        input.focus();

    }, 100);

}

function closePinOverlay() {

    document.getElementById("sidebarLock").style.display = "none";

}

function unlockInbox() {

    const pin = document.getElementById("pinInput").value.trim();

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val();

        // 🔐 WALANG PIN PA
        if (!data.pin) {

            document.getElementById("pinInput").value = "";

            document
                .getElementById("pinRecommendation")
                .classList.remove("hidden");

            return;

        }

        // ❌ MALI ANG PIN
        if (pin !== data.pin) {

            alert("Wrong PIN");

            document.getElementById("pinInput").value = "";

            document.getElementById("pinInput").focus();

            return;

        }

        // ✅ TAMA ANG PIN
        inboxUnlocked = true;

        updateSecurityUI(true);

        document.getElementById("sidebarLock").style.display = "none";

        document.getElementById("sidebarContent")
            .classList.remove("hidden");

        showCategory("chat");

    });

}

function togglePublicChat() {
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
        text: msg,
        edited: false,
        deleted: false,
        unsent: false,
        time: Date.now()
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
        const key = snap.key;

        const div = document.createElement("div");
        div.className = "message";

        if (data.user === username) {
            div.classList.add("me");
        } else {
            div.classList.add("other");
        }

        let text = data.text;

        if (data.deleted) {
            text = "🗑 This message was deleted";
        }

        if (data.unsent) {
            text = "🚫 You unsent a message";
        }

        if (data.edited) {
            text += " (edited)";
        }

        div.innerHTML = `
            <div class="msg-content">${text}</div>

            ${data.user === username ? `
                <button class="msg-menu-btn"
                    onclick="toggleMessageMenu('${key}')">
                    ⋮
                </button>

                <div id="menu-${key}" class="msg-menu hidden">

                    <button onclick="editMessage('${key}')">
                         Edit
                    </button>

                    <button onclick="deleteMessage('${key}')">
                         Delete
                    </button>

                    <button onclick="unsendMessage('${key}')">
                         Unsend
                    </button>

                </div>
            ` : ""}
        `;

        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

    });

    db.ref("chats/" + currentChat).on("child_changed", () => {

        loadMessages();

    });

}

// LOAD CHAT LIST (INBOX)
function loadChatList() {

    const chatListDiv = document.getElementById("chatList");
    const requestListDiv = document.getElementById("requestList");

    db.ref("chats").on("value", snapshot => {

        chatListDiv.innerHTML = "";

        snapshot.forEach(chat => {

            const chatKey = chat.key;

            if (chatKey.includes(username)) {

                const users = chatKey.split("_");
                const otherUser = users[0] === username ? users[1] : users[0];

                const div = document.createElement("div");
                div.className = "chat-item";

                div.innerHTML = `
                    <strong>${otherUser}</strong>
                `;

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

    db.ref("messageRequests/" + uid).on("value", snapshot => {

        requestListDiv.innerHTML = "";

        snapshot.forEach(req => {

            const data = req.val();

            const div = document.createElement("div");

            div.className = "request-item";

            div.innerHTML = `
                📩 <strong>${data.fromUsername}</strong>
            `;

            div.onclick = () => {

                showRequest(data, req.key);

                toggleSidebar();

            };

            requestListDiv.appendChild(div);

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

function loadPublicMessages() {

    const container = document.getElementById("pubMessages");

    container.innerHTML = "";

    db.ref("publicChat").off();

    db.ref("publicChat").on("value", snapshot => {

        container.innerHTML = "";

        snapshot.forEach(snap => {

            const data = snap.val();
            const key = snap.key;

            const div = document.createElement("div");
            div.className = "message";

            if (data.user === username) {
                div.classList.add("me");
            } else {
                div.classList.add("other");
            }

            let text = data.text;

            if (data.deleted) {
                text = "🗑 This message was deleted";
            }

            if (data.unsent) {
                text = "🚫 You unsent a message";
            }

            if (data.edited) {
                text += " (edited)";
            }

            div.innerHTML = `

                <strong
                style="cursor:pointer"
                onclick="openProfile('${data.user}')">

                ${data.user}

                </strong>

                <div class="msg-content">

                    ${text}

                </div>

                ${data.user === username ? `

                <button
                class="msg-menu-btn"
                onclick="togglePublicMenu('${key}')">

                ⋮

                </button>

                <div
                id="pubmenu-${key}"
                class="msg-menu hidden">

                    <button onclick="editPublicMessage('${key}')">

                         Edit

                    </button>

                    <button onclick="deletePublicMessage('${key}')">

                        Delete

                    </button>

                    <button onclick="unsendPublicMessage('${key}')">

                        Unsend

                    </button>

                </div>

                `: ''}

            `;

            container.appendChild(div);

        });

        container.scrollTop = container.scrollHeight;

    });

}

function togglePublicMenu(id) {

    document
        .getElementById("pubmenu-" + id)
        .classList.toggle("hidden");

}

function editPublicMessage(id) {

    const newText = prompt("Edit message");

    if (!newText) return;

    db.ref("publicChat/" + id).update({

        text: newText,

        edited: true

    });

}

function deletePublicMessage(id) {

    if (!confirm("Delete message?")) return;

    db.ref("publicChat/" + id).update({

        deleted: true,

        text: ""

    });

}

function unsendPublicMessage(id) {

    if (!confirm("Unsend message?")) return;

    db.ref("publicChat/" + id).update({

        unsent: true,
        text: ""

    });

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


function startChatFromPublic(targetUser) {
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

function calculateAge(birthDate) {

    if (!birthDate) return "N/A";

    const birth = new Date(birthDate);

    if (isNaN(birth.getTime())) return "N/A";

    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff = today.getMonth() - birth.getMonth();

    if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
        age--;
    }

    return age;
}

function submitPinChange() {

    const oldPin = document
        .getElementById("oldPinInput")
        .value.trim();

    const newPin = document
        .getElementById("newPinInput")
        .value.trim();

    const confirm = document
        .getElementById("confirmPinInput")
        .value.trim();

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val();

        if (data.pin) {

            if (oldPin !== data.pin) {

                alert("Wrong current PIN.");
                return;

            }

        }

        if (newPin.length !== 6) {

            alert("PIN must be 6 digits.");
            return;

        }

        if (newPin !== confirm) {

            alert("PIN does not match.");
            return;

        }

        db.ref("users/" + uid).update({

            pin: newPin

        });

        document
            .getElementById("pinBtn")
            .innerText = "Change PIN";

        alert("PIN saved.");

        closeChangePin();

    });

}

function openProfile(targetUser) {
    const overlay = document.getElementById("profileOverlay");

    getUIDByUsername(targetUser, (uidFound) => {

        if (!uidFound) {
            alert("User not found!");
            return;
        }

        currentProfileUser = uidFound;
        window.currentViewedUser = targetUser;
        window.currentViewedUid = uidFound;

        db.ref("messageRequests/" + uidFound + "/" + uid).once("value", snap => {

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
                "Age: " + calculateAge(data.age);

            document.getElementById("profileBio").innerText =
                data.bio || "No bio yet";

            document.getElementById("profileAgeInput").value =
                data.age || "";

            document.getElementById("profileBioInput").value =
                data.bio || "";

            // ✅ BUTTON CONTROL (AFTER isMe)
            document.getElementById("messageUserBtn").style.display =
                isMe ? "none" : "inline-block";

            document.querySelector(".edit-profile-btn").style.display =
                isMe ? "inline-block" : "none";

            document.querySelector(".save-profile-btn").style.display =
                isMe ? "inline-block" : "none";

            // ✅ RESET MESSAGE BOX
            document.getElementById("messageBox").classList.add("hidden");

            // ✅ STALK MODE
            if (!isMe) {
                document.getElementById("profileAgeInput").classList.add("hidden");
                document.getElementById("profileBioInput").classList.add("hidden");
            }

            overlay.classList.remove("hidden");

            setTimeout(() => {
                overlay.classList.add("active");
            }, 10);
        });

    });

    function resetMessageBox() {
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

function closeProfile() {
    const overlay = document.getElementById("profileOverlay");

    overlay.classList.remove("active");

    setTimeout(() => {
        overlay.classList.add("hidden");

        // 🔥 reset UI
        document.getElementById("messageUserBtn").style.display = "inline-block";
        const addBtn = document.getElementById("addFriendBtn");

        if (addBtn) {
            addBtn.style.display = "inline-block";
        }
        document.getElementById("messageBox").classList.add("hidden");

    }, 300);
}

function openMyProfile() {
    if (!username) return;

    openProfile(username);
}


function enableEditProfile() {

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

function saveProfile() {

    const birthday = document.getElementById("profileAgeInput").value;
    const newBio = document.getElementById("profileBioInput").value;

    db.ref("users/" + currentProfileUser).update({
        age: birthday,
        bio: newBio
    });

    document.getElementById("profileAge").innerText =
        "Age: " + calculateAge(birthday);

    document.getElementById("profileBio").innerText =
        newBio;

    document.getElementById("profileAge").classList.remove("hidden");
    document.getElementById("profileBio").classList.remove("hidden");

    document.getElementById("profileAgeInput").classList.add("hidden");
    document.getElementById("profileBioInput").classList.add("hidden");

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

function openMessageBox() {

    document.getElementById("messageUserBtn").style.display = "none";

    const addBtn = document.getElementById("addFriendBtn");

    if (addBtn) {
        addBtn.style.display = "none";
    }

    document.getElementById("messageBox").classList.remove("hidden");

}


function getUIDByUsername(targetUsername, callback) {
    db.ref("users").once("value", snapshot => {
        let foundUID = null;

        snapshot.forEach(user => {
            const data = user.val();
            if (data.username === targetUsername) {
                foundUID = user.key;
            }
        });

        callback(foundUID);
    });
}


function loadPublicMessages() {
    const pubDiv = document.getElementById("pubMessages");
    if (!pubDiv) return;
    pubDiv.innerHTML = "<p style='color:#6b7280;text-align:center;padding:20px'>Loading public chat...</p>";
    try { db.ref("publicMessages").off(); } catch (e) { }

    db.ref("publicMessages").limitToLast(100).on("child_added", snap => {
        const data = snap.val();
        if (!data) return;
        if (pubDiv.innerHTML.includes("Loading")) pubDiv.innerHTML = "";

        const isMe = data.user === username;
        const safeUser = (data.user || "").replace(/</g, "&lt;");
        const safeText = (data.text || "").replace(/</g, "&lt;");

        const msgEl = document.createElement("div");
        msgEl.style.cssText = "max-width:80%;margin:8px 0;padding:10px 14px;border-radius:14px;background:" + (isMe ? "#00ff88;color:#000;margin-left:auto" : "rgba(255,255,255,0.08)") + ";cursor:default;";

        // DITO YUNG CLICKABLE USERNAME
        msgEl.innerHTML = `
            <div onclick="openPublicUserProfile('${safeUser}')" 
                 style="font-size:1rem;font-weight:1000;opacity:0.9;cursor:pointer;color:${isMe ? '#000' : '#00ff88'};text-decoration:underline">
                 ${safeUser} ${isMe ? '' : ''}
            </div>
            <div style="margin-top:7px">${safeText}</div>
            <small style="font-size:0.65rem;opacity:0.5">${data.time ? new Date(data.time).toLocaleTimeString() : ""}</small>
        `;

        pubDiv.appendChild(msgEl);
        pubDiv.scrollTop = pubDiv.scrollHeight;
    });
}

function sendPublicMessage() {
    const input = document.getElementById("pubInput");
    const text = input.value.trim();
    if (!text) return;
    if (!username) {
        alert("Username loading pa...");
        return;
    }
    db.ref("publicMessages").push({
        user: username,
        text: text,
        time: Date.now()
    }).then(() => { input.value = ""; });
}

function openPublicUserProfile(clickedUsername) {
    if (!clickedUsername) return;

    if (clickedUsername === username) {
        openMyProfile();
        return;
    }

    db.ref("users").orderByChild("username").equalTo(clickedUsername).once("value", snap => {
        const users = snap.val();
        if (!users) {
            alert("User not found: " + clickedUsername);
            return;
        }
        const uid = Object.keys(users)[0];
        const userData = users[uid];

        currentProfileUser = uid;
        window.currentViewedUser = clickedUsername;
        window.currentViewedUid = uid;

        document.getElementById("profileName").innerText = userData.username || clickedUsername;
        document.getElementById("profileBio").innerText = userData.bio || "No bio";
        document.getElementById("profileAge").innerText = userData.age ? "Birthday: " + userData.age : "";
        document.getElementById("profileFollowers").innerText = userData.followers ? userData.followers + " Followers" : "";
        document.getElementById("profileFollowing").innerText = userData.following ? userData.following + " Following" : "";

        const editBtn = document.querySelector(".edit-profile-btn");
        const saveBtn = document.querySelector(".save-profile-btn");
        const messageBtn = document.getElementById("messageUserBtn");
        const ageInput = document.getElementById("profileAgeInput");
        const bioInput = document.getElementById("profileBioInput");

        if (editBtn) editBtn.classList.add("hidden");
        if (saveBtn) saveBtn.classList.add("hidden");
        if (ageInput) ageInput.classList.add("hidden");
        if (bioInput) bioInput.classList.add("hidden");

        if (messageBtn) {
            messageBtn.classList.remove("hidden");
            messageBtn.innerText = "Message " + clickedUsername;
            messageBtn.style.display = "block";
        }

        document.getElementById("profileOverlay").classList.remove("hidden");

    });
}

const originalOpenMyProfile = window.openMyProfile;
window.openMyProfile = function () {
    if (originalOpenMyProfile) originalOpenMyProfile();

    setTimeout(() => {
        const editBtn = document.querySelector(".edit-profile-btn");
        const messageBtn = document.getElementById("messageUserBtn");
        if (editBtn) editBtn.classList.remove("hidden");
        if (messageBtn) messageBtn.classList.add("hidden");
    }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
    const pubInput = document.getElementById("pubInput");
    if (pubInput) {
        pubInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendPublicMessage();
            }
        });
    }
});

let currentProfileUser = "";


function sendMessageRequest() {
    const textarea = document.getElementById("requestMessage");

    if (!textarea) {
        alert("somethings wrong!!");
        return;
    }

    const msg = textarea.value.trim();
    const targetUID = currentProfileUser;

    if (!uid) {
        alert("you must log-in first!!");
        return;
    }

    if (!targetUID) {
        alert("No 4ecipient received!!!");
        return;
    }

    if (targetUID === uid) {
        alert("ERROR!!");
        return;
    }

    if (!msg) {
        alert("you must type first!!");
        return;
    }

    const requestRef = db.ref("messageRequests/" + targetUID + "/" + uid);

    requestRef.once("value")
        .then((snap) => {
            const existing = snap.val();

            if (existing?.cooldownUntil && Date.now() < existing.cooldownUntil) {
                startCooldownUI(existing.cooldownUntil);
                alert("Cooldown!!");
                return;
            }

            const now = Date.now();
            const cooldownUntil = now + 24 * 60 * 60 * 1000;

            return requestRef.set({
                fromUID: uid,
                fromUsername: username,
                message: msg,
                sentAt: now,
                cooldownUntil: cooldownUntil
            }).then(() => {
                textarea.value = "";
                startCooldownUI(cooldownUntil);
                alert("Message request sent!");
            });
        })
        .catch((error) => {
            console.error("Message request failed:", error);
            alert("your message not sent!!: " + error.message);
        });
}


function disableMessageBox() {

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

function acceptMessageRequest(senderName, senderUID) {

    currentChat = [username, senderName].sort().join("_");

    document.getElementById("chatWith").innerText =
        "Chat with: " + senderName;

    loadMessages();
    listenStatus(senderName);

    // delete request after accept
    db.ref("messageRequests/" + uid).remove();
}

function startCooldownUI(cooldownUntil) {
    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    if (!btn || !textarea) {
        console.error("Missing message request elements:", { btn, textarea });
        return;
    }

    btn.disabled = true;
    textarea.disabled = true;
    btn.style.opacity = "0.4";
    textarea.style.opacity = "0.6";

    if (cooldownInterval) clearInterval(cooldownInterval);

    function updateCooldown() {
        const remaining = cooldownUntil - Date.now();

        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
            resetMessageBox();
            return;
        }

        const hrs = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);

        btn.innerText = `Wait ${hrs}h ${mins}m ${secs}s`;
    }

    updateCooldown();
    cooldownInterval = setInterval(updateCooldown, 1000);
}

function resetMessageBox() {
    const btn = document.querySelector(".btn-sendmssg");
    const textarea = document.getElementById("requestMessage");

    if (!btn || !textarea) return;

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

function showRequest(data, requestKey) {
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

function acceptRequest() {
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

function declineRequest() {
    if (!currentRequest) return;

    db.ref("messageRequests/" + uid + "/" + currentRequest.key).remove();

    document.getElementById("requestOverlay").classList.add("hidden");

    currentRequest = null;
}


function openSettings() {

    const overlay = document.getElementById("settingsOverlay");

    overlay.classList.remove("hidden");
    overlay.classList.add("active");

    db.ref("users/" + uid).once("value").then((snap) => {

        const data = snap.val() || {};

        // EMAIL
        document.getElementById("emailSetting").value =
            data.email || "";

        // BIRTHDAY
        document.getElementById("birthdaySetting").value =
            data.age || "";

        // AGE
        document.getElementById("ageSetting").value =
            calculateAge(data.age);

        // BIO
        document.getElementById("bioSetting").value =
            data.bio || "";

        // PIN BUTTON
        document.getElementById("pinBtn").innerText =
            data.pin ? "Change PIN" : "Create PIN";

    });

}

function closeSettings() {

    document.getElementById("settingsOverlay")
        .classList.add("hidden");

}

document.getElementById("birthdaySetting").addEventListener("change", function () {

    document.getElementById("ageSetting").value =
        calculateAge(this.value);

});

function saveSettings() {

    db.ref("users/" + uid).update({

        age: document.getElementById("birthdaySetting").value,

        bio: document.getElementById("bioSetting").value

    });

    alert("Settings saved.");

    closeSettings();

}

async function submitEmailChange() {

    const currentPassword =
        document.getElementById("currentPasswordInput").value.trim();

    const newEmail =
        document.getElementById("newEmailInput").value.trim();

    const confirmEmail =
        document.getElementById("confirmEmailInput").value.trim();

    if (!currentPassword) {

        alert("Enter current password.");
        return;

    }

    if (!newEmail) {

        alert("Enter new email.");
        return;

    }

    if (newEmail !== confirmEmail) {

        alert("Emails do not match.");
        return;

    }

    try {

        await window.changeEmail(
            currentPassword,
            newEmail
        );

        closeChangeEmail();

        document.getElementById("currentPasswordInput").value = "";
        document.getElementById("newEmailInput").value = "";
        document.getElementById("confirmEmailInput").value = "";

    }
    catch (err) {

        alert(err.message);

    }

}

function submitPasswordChange() {

    const current = document
        .getElementById("currentPasswordChange")
        .value.trim();

    const pass = document
        .getElementById("newPasswordChange")
        .value.trim();

    const confirm = document
        .getElementById("confirmPasswordChange")
        .value.trim();

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val();

        if (current !== data.password) {

            alert("Current password is incorrect.");
            return;

        }

        if (pass !== confirm) {

            alert("Passwords do not match.");
            return;

        }

        db.ref("users/" + uid).update({

            password: pass

        });

        alert("Password updated.");

        closeChangePassword();

    });

}

function toggleMessageMenu(id) {

    document
        .getElementById("menu-" + id)
        .classList.toggle("hidden");

}

function openChangePin() {

    document
        .getElementById("changePinOverlay")
        .classList.remove("hidden");

}

function closeChangePin() {

    document
        .getElementById("changePinOverlay")
        .classList.add("hidden");

}

function openChangePassword() {

    document
        .getElementById("changePasswordOverlay")
        .classList.remove("hidden");

}

function closeChangePassword() {

    document
        .getElementById("changePasswordOverlay")
        .classList.add("hidden");

}

function editMessage(id) {

    const newText = prompt("Edit message");

    if (!newText) return;

    db.ref("chats/" + currentChat + "/" + id).update({

        text: newText,

        edited: true

    });

}

function unsendMessage(id) {

    if (!confirm("Unsend message?")) return;

    db.ref("chats/" + currentChat + "/" + id).update({

        unsent: true,

        text: ""

    });

}

function deleteMessage(id) {

    if (!confirm("Delete this message?")) return;

    db.ref("chats/" + currentChat + "/" + id).update({

        deleted: true,

        text: ""

    });

}

function openChangeEmail() {

    document
        .getElementById("changeEmailOverlay")
        .classList.remove("hidden");

}

function closeChangeEmail() {

    document
        .getElementById("changeEmailOverlay")
        .classList.add("hidden");

}

function updateSecurityUI(unlocked) {

    document.getElementById("targetUser").disabled = !unlocked;
    document.getElementById("searchBtn").disabled = !unlocked;

    if (unlocked) {

        document.getElementById("targetUser").placeholder =
            "Search username";

        document.getElementById("searchBtn").innerHTML =
            "Search";

    } else {

        document.getElementById("targetUser").placeholder =
            "🔒 Unlock PIN first";

        document.getElementById("searchBtn").innerHTML =
            "🔒 Search";

    }

}

function closePinRecommendation() {

    document
        .getElementById("pinRecommendation")
        .classList.add("hidden");

}

function goCreatePin() {

    closePinRecommendation();

    openSettings();

}


document.addEventListener("DOMContentLoaded", () => {

    const pin = document.getElementById("pinInput");

    pin.addEventListener("input", function () {

        this.value = this.value.replace(/\D/g, "").substring(0, 6);

        if (this.value.length === 6) {
            unlockInbox();
        }

    });

    pin.addEventListener("keydown", function (e) {

        if (e.key === "Enter") {
            unlockInbox();
        }

    });

});

autoSaveProfile();
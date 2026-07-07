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
                        ✏ Edit
                    </button>

                    <button onclick="deleteMessage('${key}')">
                        🗑 Delete
                    </button>

                    <button onclick="unsendMessage('${key}')">
                        🚫 Unsend
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

                        ✏ Edit

                    </button>

                    <button onclick="deletePublicMessage('${key}')">

                        🗑 Delete

                    </button>

                    <button onclick="unsendPublicMessage('${key}')">

                        🚫 Unsend

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

function changePin() {

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val();

        if (!data.pin) {

            const pin = prompt("Create 6-digit PIN");

            if (!pin) return;

            if (pin.length != 6) {

                alert("PIN must be 6 digits.");

                return;

            }

            db.ref("users/" + uid).update({

                pin: pin

            });

            document.getElementById("pinBtn").innerText = "Change PIN";

            alert("PIN created.");

            return;

        }

        const oldPin = prompt("Enter current PIN");

        if (oldPin !== data.pin) {

            alert("Wrong PIN.");

            return;

        }

        const newPin = prompt("Enter new PIN");

        if (!newPin) return;

        if (newPin.length != 6) {

            alert("PIN must be 6 digits.");

            return;

        }

        db.ref("users/" + uid).update({

            pin: newPin

        });

        alert("PIN changed.");

    });

}

function openProfile(targetUser) {
    const overlay = document.getElementById("profileOverlay");

    getUIDByUsername(targetUser, (uidFound) => {

        if (!uidFound) {
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

let currentProfileUser = "";


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
function sendMessageRequest() {
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

function startCooldownUI(cooldownUntil) {

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

function resetMessageBox() {

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

    document.getElementById("settingsOverlay").classList.remove("hidden");
    document.getElementById("settingsOverlay").classList.add("active");

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val() || {};

        // EMAIL
        const user = firebase.auth().currentUser;

        document.getElementById("emailSetting").value =
            user ? user.email : (data.email || "");

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

function changeEmail() {

    db.ref("users/" + uid).once("value", snap => {

        const data = snap.val() || {};

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // CHECK COOLDOWN
        if (data.emailChangeCooldown && now < data.emailChangeCooldown) {

            const remaining = data.emailChangeCooldown - now;

            const hrs = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            alert(`You can change your email again in ${hrs}h ${mins}m.`);

            return;
        }

        const newEmail = prompt("Enter new email");

        if (!newEmail) return;

        document.getElementById("emailSetting").value = newEmail;

        alert("Email updated successfully.");

    });

}

function changePassword() {

    const pass = prompt("Enter new password");

    if (!pass) return;

    db.ref("users/" + uid).update({
        password: pass
    });

    alert("Password updated.");

}

function toggleMessageMenu(id) {

    document
        .getElementById("menu-" + id)
        .classList.toggle("hidden");

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

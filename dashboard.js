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

let currentUserData = {};
let presenceReady = false;

function getCurrentUserRef() {
    return db.ref("users/" + uid);
}

function setOnlineStatus(status) {
    if (!uid) return Promise.resolve();

    const visible = status === true && currentUserData.showOnlineStatus !== false;

    return getCurrentUserRef().update({
        online: visible,
        lastActiveAt: Date.now()
    }).catch(error => {
        console.warn("Could not update active status:", error);
    });
}

async function initializePresence() {
    if (!uid || presenceReady) return;
    presenceReady = true;

    const onlineRef = getCurrentUserRef().child("online");
    try {
        await onlineRef.onDisconnect().set(false);
    } catch (error) {
        console.warn("onDisconnect setup failed:", error);
    }

    await setOnlineStatus(true);
}

if (!uid) {
    window.location.replace("index.html");
} else {
    getCurrentUserRef().once("value").then(async snap => {
        const data = snap.val() || {};

        if (!snap.exists()) {
            alert("User profile was not found. Please sign in again.");
            localStorage.removeItem("uid");
            window.location.replace("index.html");
            return;
        }

        currentUserData = data;
        username = data.username || localStorage.getItem("white_mssg_username") || "WHITE_USER";

        document.getElementById("chat").classList.remove("hidden");
        document.getElementById("userDisplay").innerText = username;

        loadSettingsDefaults(data);
        initializePinInputs();
        await initializePresence();
        loadChatList();
        showCategory("chat");
        loadPublicMessages();
    });
}


function login() {
    // Kept only for compatibility with older markup.
    updateSecurityUI(false);
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
    clearPinGroup("lock");

    const lock = document.getElementById("sidebarLock");
    if (lock) lock.style.display = "flex";

    setTimeout(() => {
        document.getElementById("pinInput1")?.focus();
    }, 100);
}

function closePinOverlay() {
    const lock = document.getElementById("sidebarLock");
    if (lock) lock.style.display = "none";
}

async function unlockInbox() {
    const pin = getPinValue("lock");
    if (!/^\d{6}$/.test(pin)) {
        return alert("Enter all 6 PIN digits.");
    }

    const securityRef = db.ref("users/" + uid + "/pinSecurity");
    const now = Date.now();

    try {
        const securitySnap = await securityRef.once("value");
        let security = securitySnap.val() || { attempts: 0, lockUntil: 0 };

        if (security.lockUntil && now < security.lockUntil) {
            const remaining = Math.ceil((security.lockUntil - now) / 3600000);
            clearPinGroup("lock");
            return alert(`PIN access is held. Try again in about ${remaining} hour(s).`);
        }

        if (security.lockUntil && now >= security.lockUntil) {
            security = { attempts: 0, lockUntil: 0 };
            await securityRef.set(security);
        }

        const snap = await db.ref("users/" + uid).once("value");
        const data = snap.val() || {};

        if (!data.pin) {
            clearPinGroup("lock");
            document.getElementById("pinRecommendation").classList.remove("hidden");
            return;
        }

        if (pin !== data.pin) {
            const result = await securityRef.transaction(current => {
                current = current || { attempts: 0, lockUntil: 0 };
                if (current.lockUntil && Date.now() < current.lockUntil) return current;

                const attempts = (current.attempts || 0) + 1;
                return attempts >= 4
                    ? { attempts: 4, lockUntil: Date.now() + 24 * 60 * 60 * 1000 }
                    : { attempts, lockUntil: 0 };
            });

            const updated = result.snapshot.val() || {};
            clearPinGroup("lock");

            if (updated.lockUntil && Date.now() < updated.lockUntil) {
                alert("4 incorrect PIN attempts. PIN access is held for 24 hours.");
            } else {
                alert(`Wrong PIN. ${Math.max(0, 4 - (updated.attempts || 0))} attempt(s) remaining.`);
                document.getElementById("pinInput1")?.focus();
            }
            return;
        }

        await securityRef.set({ attempts: 0, lockUntil: 0 });
        inboxUnlocked = true;
        currentUserData = { ...currentUserData, ...data };
        updateSecurityUI(true);
        clearPinGroup("lock");
        document.getElementById("sidebarLock").style.display = "none";
        document.getElementById("sidebarContent").classList.remove("hidden");
        showCategory("chat");
    } catch (error) {
        console.error("PIN verification failed:", error);
        alert("Could not verify PIN. Check your connection and try again.");
    }
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
async function startChat() {
    if (!inboxUnlocked) return alert("Unlock your inbox PIN first.");

    const target = document.getElementById("targetUser").value.trim();
    if (!target) return alert("Enter a username to search.");

    if (target === username) {
        return openMyProfile();
    }

    try {
        const snap = await db.ref("users")
            .orderByChild("username")
            .equalTo(target)
            .once("value");

        if (!snap.exists()) return alert("User not found.");

        let foundUid = null;
        let foundData = null;
        snap.forEach(child => {
            foundUid = child.key;
            foundData = child.val() || {};
        });

        if (!foundUid || !foundData) return alert("User not found.");

        if (foundData.searchable === false) {
            return alert("This user has disabled searchable profile.");
        }

        currentChat = [username, target].sort().join("_");
        document.getElementById("targetUser").value = target;
        document.getElementById("chatWith").innerText = "Chat with: " + target;

        loadMessages();
        listenStatus(target);
    } catch (error) {
        console.error("User search failed:", error);
        alert("Search failed. Please check your connection and try again.");
    }
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
    db.ref("users").orderByChild("username").equalTo(target).once("value", snapshot => {
        let targetUid = null;

        snapshot.forEach(child => {
            targetUid = child.key;
        });

        const statusElement = document.getElementById("status");
        if (!targetUid) {
            statusElement.innerText = "⚪ Offline";
            return;
        }

        const targetRef = db.ref("users/" + targetUid);

        if (window._activeStatusRef && window._activeStatusHandler) {
            window._activeStatusRef.off("value", window._activeStatusHandler);
        }

        window._activeStatusRef = targetRef;
        window._activeStatusHandler = snap => {
            const data = snap.val() || {};
            if (data.showOnlineStatus === false) {
                statusElement.innerText = "⚪ Offline";
                return;
            }
            statusElement.innerText = data.online ? "🟢 Online" : "⚪ Offline";
        };

        targetRef.on("value", window._activeStatusHandler);
    });
}

window.addEventListener("beforeunload", () => {
    if (uid && currentUserData.showOnlineStatus !== false) {
        try {
            db.ref("users/" + uid + "/online").set(false);
        } catch (_) {}
    }
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

async function submitPinChange() {
    const oldPin = getPinValue("old");
    const newPin = getPinValue("new");
    const confirm = getPinValue("confirm");

    if (!/^\d{6}$/.test(newPin)) {
        return alert("New PIN must contain exactly 6 digits.");
    }

    if (newPin !== confirm) {
        return alert("New PIN does not match.");
    }

    try {
        const snap = await getCurrentUserRef().once("value");
        const data = snap.val() || {};

        if (data.pin && oldPin !== data.pin) {
            return alert("Wrong current PIN.");
        }

        await getCurrentUserRef().update({
            pin: newPin,
            pinUpdatedAt: Date.now(),
            pinSecurity: { attempts: 0, lockUntil: 0 }
        });

        currentUserData = { ...currentUserData, pin: newPin };
        const pinBtn = document.getElementById("pinBtn");
        if (pinBtn) pinBtn.innerText = "Change PIN";

        clearPinGroup("old");
        clearPinGroup("new");
        clearPinGroup("confirm");
        closeChangePin();

        alert(inboxUnlocked
            ? "6-digit PIN updated successfully."
            : "6-digit PIN saved. You can now unlock your inbox.");
    } catch (error) {
        console.error("PIN update failed:", error);
        alert("Could not save the PIN. Please try again.");
    }
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

            const profileAvatar = document.querySelector(".profile-avatar");
            if (profileAvatar) {
                if (data.photoURL) {
                    profileAvatar.style.backgroundImage = `url("${data.photoURL}")`;
                    profileAvatar.textContent = "";
                    profileAvatar.classList.add("has-photo");
                } else {
                    profileAvatar.style.backgroundImage = "";
                    profileAvatar.textContent = "👤";
                    profileAvatar.classList.remove("has-photo");
                }
            }

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


function loadSettingsDefaults(data = {}) {
    const email = data.email || "";
    const birthday = data.age || "";
    const searchable = data.searchable !== false;
    const showOnline = data.showOnlineStatus !== false;

    const emailInput = document.getElementById("emailSetting");
    const usernameInput = document.getElementById("usernameSetting");
    const birthdayInput = document.getElementById("birthdaySetting");
    const ageInput = document.getElementById("ageSetting");
    const bioInput = document.getElementById("bioSetting");
    const onlineToggle = document.getElementById("onlineToggle");
    const searchableToggle = document.getElementById("searchableToggle");

    if (emailInput) emailInput.value = email;
    if (usernameInput) usernameInput.value = data.username || username;
    if (birthdayInput) birthdayInput.value = birthday;
    if (ageInput) ageInput.value = calculateAge(birthday);
    if (bioInput) bioInput.value = data.bio || "";
    if (onlineToggle) onlineToggle.checked = showOnline;
    if (searchableToggle) searchableToggle.checked = searchable;

    const settingsUsername = document.getElementById("settingsUsername");
    const settingsEmail = document.getElementById("settingsEmailPreview");
    const settingsAvatar = document.getElementById("settingsAvatar");
    const pinBtn = document.getElementById("pinBtn");
    const status = document.getElementById("settingsAccountStatus");

    if (settingsUsername) settingsUsername.innerText = data.username || username;
    if (settingsEmail) settingsEmail.innerText = email || "No email on record";
    if (pinBtn) pinBtn.innerText = data.pin ? "Change PIN" : "Create PIN";

    if (status) {
        status.innerHTML = showOnline
            ? '<i class="status-indicator"></i> Active status is enabled'
            : '<i class="status-indicator offline"></i> Active status is hidden';
    }

    if (settingsAvatar) {
        if (data.photoURL) {
            settingsAvatar.style.backgroundImage = `url("${data.photoURL}")`;
            settingsAvatar.textContent = "";
            settingsAvatar.classList.add("has-photo");
        } else {
            settingsAvatar.style.backgroundImage = "";
            settingsAvatar.textContent = "👤";
            settingsAvatar.classList.remove("has-photo");
        }
    }
}

function openSettings() {
    const overlay = document.getElementById("settingsOverlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("active");

    getCurrentUserRef().once("value").then(snap => {
        currentUserData = snap.val() || {};
        loadSettingsDefaults(currentUserData);
        updatePrivacyPreviews();
    });
}

function closeSettings() {
    const overlay = document.getElementById("settingsOverlay");
    overlay.classList.remove("active");
    setTimeout(() => overlay.classList.add("hidden"), 180);
}

function updatePrivacyPreviews() {
    const toggle = document.getElementById("onlineToggle");
    const status = document.getElementById("settingsAccountStatus");
    if (!toggle || !status) return;

    status.innerHTML = toggle.checked
        ? '<i class="status-indicator"></i> Active status is enabled'
        : '<i class="status-indicator offline"></i> Active status is hidden';
}

function saveSettings() {
    const age = document.getElementById("birthdaySetting").value;
    const bio = document.getElementById("bioSetting").value.trim();
    const showOnlineStatus = document.getElementById("onlineToggle").checked;
    const searchable = document.getElementById("searchableToggle").checked;

    getCurrentUserRef().update({
        age,
        bio,
        showOnlineStatus,
        searchable,
        online: showOnlineStatus,
        lastActiveAt: Date.now()
    }).then(() => {
        currentUserData = {
            ...currentUserData,
            age,
            bio,
            showOnlineStatus,
            searchable,
            online: showOnlineStatus
        };

        const saveStatus = document.getElementById("settingsSaveStatus");
        if (saveStatus) saveStatus.innerText = "✓ Settings saved successfully.";

        updatePrivacyPreviews();
        return setOnlineStatus(true);
    }).then(() => {
        setTimeout(() => closeSettings(), 350);
    }).catch(error => {
        console.error("Settings save failed:", error);
        alert("Could not save settings. Please try again.");
    });
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

async function submitPasswordChange() {
    const current = document.getElementById("currentPasswordChange").value.trim();
    const pass = document.getElementById("newPasswordChange").value.trim();
    const confirm = document.getElementById("confirmPasswordChange").value.trim();

    if (!current || !pass || !confirm) return alert("Please complete all password fields.");
    if (pass.length < 6) return alert("New password must be at least 6 characters.");
    if (pass !== confirm) return alert("Passwords do not match.");

    try {
        await window.changePassword(current, pass);

        document.getElementById("currentPasswordChange").value = "";
        document.getElementById("newPasswordChange").value = "";
        document.getElementById("confirmPasswordChange").value = "";

        closeChangePassword();
        alert("Password updated successfully.");
    } catch (error) {
        console.error("Password update failed:", error);

        if (error?.code === "auth/wrong-password" || error?.code === "auth/invalid-credential") {
            alert("Current password is incorrect.");
        } else {
            alert(error?.message || "Could not update password.");
        }
    }
}

function toggleMessageMenu(id) {

    document
        .getElementById("menu-" + id)
        .classList.toggle("hidden");

}

function openChangePin() {
    const overlay = document.getElementById("changePinOverlay");
    overlay.classList.remove("hidden");
    overlay.classList.add("active");

    const hasPin = !!currentUserData.pin;
    const oldRow = document.getElementById("oldPinRow");
    if (oldRow) oldRow.classList.toggle("hidden", !hasPin);

    clearPinGroup("old");
    clearPinGroup("new");
    clearPinGroup("confirm");

    setTimeout(() => {
        const target = hasPin ? document.getElementById("oldPin1") : document.getElementById("newPin1");
        if (target) target.focus();
    }, 80);
}

function closeChangePin() {
    const overlay = document.getElementById("changePinOverlay");
    overlay.classList.remove("active");
    setTimeout(() => overlay.classList.add("hidden"), 180);

    clearPinGroup("old");
    clearPinGroup("new");
    clearPinGroup("confirm");
}

function getPinElements(prefix) {
    const ids = prefix === "lock"
        ? ["pinInput1","pinInput2","pinInput3","pinInput4","pinInput5","pinInput6"]
        : prefix === "old"
            ? ["oldPin1","oldPin2","oldPin3","oldPin4","oldPin5","oldPin6"]
            : prefix === "new"
                ? ["newPin1","newPin2","newPin3","newPin4","newPin5","newPin6"]
                : ["confirmPin1","confirmPin2","confirmPin3","confirmPin4","confirmPin5","confirmPin6"];

    return ids.map(id => document.getElementById(id)).filter(Boolean);
}

function getPinValue(prefix) {
    return getPinElements(prefix).map(input => input.value).join("");
}

function clearPinGroup(prefix) {
    getPinElements(prefix).forEach(input => input.value = "");
}

function fillPinGroup(prefix, text) {
    const digits = String(text || "").replace(/\D/g, "").slice(0, 6);
    const elements = getPinElements(prefix);
    elements.forEach((input, index) => {
        input.value = digits[index] || "";
    });
}

function initializePinInputs() {
    ["lock", "old", "new", "confirm"].forEach(prefix => {
        const elements = getPinElements(prefix);
        if (!elements.length || elements[0].dataset.pinReady) return;

        elements.forEach((input, index) => {
            input.dataset.pinReady = "1";

            input.addEventListener("input", event => {
                const value = event.target.value.replace(/\D/g, "");

                if (value.length > 1) {
                    fillPinGroup(prefix, value);
                } else {
                    event.target.value = value.slice(0, 1);
                    if (value && index < elements.length - 1) {
                        elements[index + 1].focus();
                    }
                }

                if (prefix === "lock" && getPinValue("lock").length === 6) {
                    unlockInbox();
                }
            });

            input.addEventListener("keydown", event => {
                if (event.key === "Backspace" && !input.value && index > 0) {
                    event.preventDefault();
                    elements[index - 1].value = "";
                    elements[index - 1].focus();
                }

                if (event.key === "ArrowLeft" && index > 0) {
                    event.preventDefault();
                    elements[index - 1].focus();
                }

                if (event.key === "ArrowRight" && index < elements.length - 1) {
                    event.preventDefault();
                    elements[index + 1].focus();
                }

                if (event.key === "Enter" && prefix === "lock") {
                    event.preventDefault();
                    unlockInbox();
                }
            });

            input.addEventListener("paste", event => {
                event.preventDefault();
                const pasted = (event.clipboardData || window.clipboardData).getData("text");
                fillPinGroup(prefix, pasted);

                const values = getPinElements(prefix);
                const next = values.find(el => !el.value);
                (next || values[values.length - 1])?.focus();

                if (prefix === "lock" && getPinValue("lock").length === 6) {
                    unlockInbox();
                }
            });
        });
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
    setTimeout(() => openChangePin(), 220);
}


document.addEventListener("DOMContentLoaded", () => {
    initializePinInputs();

    const birthday = document.getElementById("birthdaySetting");
    if (birthday) {
        birthday.addEventListener("change", function () {
            document.getElementById("ageSetting").value = calculateAge(this.value);
        });
    }

    const onlineToggle = document.getElementById("onlineToggle");
    if (onlineToggle) onlineToggle.addEventListener("change", updatePrivacyPreviews);

    const searchableToggle = document.getElementById("searchableToggle");
    if (searchableToggle) searchableToggle.addEventListener("change", () => {
        const note = document.getElementById("settingsSaveStatus");
        if (note) {
            note.innerText = searchableToggle.checked
                ? "Searchable profile is ON."
                : "Your username will be hidden from user search when saved.";
        }
    });
});

const timeElement = document.getElementById("clockTime");
const dateElement = document.getElementById("clockDate");

function updateClock() {
    const now = new Date();

    const time = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(now);

    const date = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(now);

    timeElement.textContent = time;
    dateElement.textContent = date;
}

updateClock();
setInterval(updateClock, 1000);

autoSaveProfile();
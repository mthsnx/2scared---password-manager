     // --- Simple crypto helpers (SHA-256 using Web Crypto) ---
    async function sha256(message) {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    }

    // DOM elements
    const authSection = document.getElementById("auth-section");
    const registerBox = document.getElementById("register-box");
    const loginBox = document.getElementById("login-box");

    const regPassword = document.getElementById("reg-password");
    const regConfirm = document.getElementById("reg-confirm");
    const regSubmit = document.getElementById("reg-submit");
    const regMessage = document.getElementById("reg-message");

    const loginPassword = document.getElementById("login-password");
    const loginSubmit = document.getElementById("login-submit");
    const loginMessage = document.getElementById("login-message");

    const appSection = document.getElementById("app-section");
    const logoutBtn = document.getElementById("logout-btn");

    const accountNameInput = document.getElementById("account-name");
    const lengthInput = document.getElementById("length");
    const generateBtn = document.getElementById("generate-btn");
    const generatedPasswordInput = document.getElementById("generated-password");
    const copyBtn = document.getElementById("copy-btn");
    const saveBtn = document.getElementById("save-btn");
    const saveMessage = document.getElementById("save-message");
    const passwordList = document.getElementById("password-list");

    // --- Local storage helpers ---
    function getMasterHash() {
      return localStorage.getItem("pm_master_hash");
    }

    function setMasterHash(hash) {
      localStorage.setItem("pm_master_hash", hash);
    }

    function loadPasswords() {
      const raw = localStorage.getItem("pm_passwords");
      if (!raw) return [];
      try {
        return JSON.parse(raw);
      } catch (_) {
        return [];
      }
    }

    function savePasswords(list) {
      localStorage.setItem("pm_passwords", JSON.stringify(list));
    }

    // --- Password generator (12-15 characters) ---
    function generatePassword(length) {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?/|";
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      let pwd = "";
      for (let i = 0; i < length; i++) {
        const idx = array[i] % chars.length;
        pwd += chars.charAt(idx);
      }
      return pwd;
    }

    // --- Render saved passwords ---
    function renderPasswordList() {
      const list = loadPasswords();
      if (list.length === 0) {
        passwordList.innerHTML = "<p class='small'>No passwords saved yet.</p>";
        return;
      }
      passwordList.innerHTML = "";
      list.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "pwd-item";

        const top = document.createElement("div");
        top.className = "pwd-top";

        const accountSpan = document.createElement("span");
        accountSpan.className = "pwd-account";
        accountSpan.textContent = item.account || "(no name)";

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.gap = "6px";

        const copyBtn = document.createElement("button");
        copyBtn.className = "btn btn-secondary";
        copyBtn.textContent = "Copy";
        copyBtn.onclick = () => {
          navigator.clipboard?.writeText(item.password);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-secondary";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => {
          const all = loadPasswords();
          all.splice(index, 1);
          savePasswords(all);
          renderPasswordList();
        };

        btnRow.appendChild(copyBtn);
        btnRow.appendChild(deleteBtn);
        top.appendChild(accountSpan);
        top.appendChild(btnRow);

        const pwSpan = document.createElement("span");
        pwSpan.className = "pwd-password";
        pwSpan.textContent = item.password;

        div.appendChild(top);
        div.appendChild(pwSpan);
        passwordList.appendChild(div);
      });
    }

    // --- Auth flow ---
    function showApp() {
      authSection.classList.add("hidden");
      appSection.classList.remove("hidden");
      renderPasswordList();
    }

    function showLogin() {
      authSection.classList.remove("hidden");
      loginBox.classList.remove("hidden");
      registerBox.classList.add("hidden");
      appSection.classList.add("hidden");
    }

    function showRegister() {
      authSection.classList.remove("hidden");
      registerBox.classList.remove("hidden");
      loginBox.classList.add("hidden");
      appSection.classList.add("hidden");
    }

    // On load: decide what to show
    window.addEventListener("DOMContentLoaded", () => {
      if (getMasterHash()) {
        showLogin();
      } else {
        showRegister();
      }
    });

    // Register master password
    regSubmit.addEventListener("click", async () => {
      regMessage.textContent = "";
      const pw = regPassword.value.trim();
      const pw2 = regConfirm.value.trim();

      if (pw.length < 8) {
        regMessage.textContent = "Use at least 8 characters for your master password.";
        return;
      }
      if (pw !== pw2) {
        regMessage.textContent = "Passwords do not match.";
        return;
      }
      const hash = await sha256(pw);
      setMasterHash(hash);
      regPassword.value = "";
      regConfirm.value = "";
      regMessage.textContent = "";
      showApp();
    });

    // Login
    loginSubmit.addEventListener("click", async () => {
      loginMessage.textContent = "";
      const pw = loginPassword.value.trim();
      if (!pw) {
        loginMessage.textContent = "Enter your master password.";
        return;
      }
      const hash = await sha256(pw);
      if (hash === getMasterHash()) {
        loginPassword.value = "";
        loginMessage.textContent = "";
        showApp();
      } else {
        loginMessage.textContent = "Incorrect password.";
      }
    });

    // Logout / lock
    logoutBtn.addEventListener("click", () => {
      showLogin();
    });

    // Generate password
    generateBtn.addEventListener("click", () => {
      saveMessage.textContent = "";
    let length = parseInt(lengthInput.value, 10);
    if (isNaN(length) || length < 12) length = 12;
    if (length > 25) length = 25;

      lengthInput.value = length; // clamp visibly
      const pwd = generatePassword(length);
      generatedPasswordInput.value = pwd;
    });

    // Copy generated password
    copyBtn.addEventListener("click", () => {
      const pwd = generatedPasswordInput.value;
      if (!pwd) return;
      navigator.clipboard?.writeText(pwd);
    });

    // Save password for this account
    saveBtn.addEventListener("click", () => {
      saveMessage.textContent = "";
      const account = accountNameInput.value.trim();
      const pwd = generatedPasswordInput.value.trim();

      if (!pwd) {
        saveMessage.textContent = "";
        saveMessage.className = "error";
        saveMessage.textContent = "Generate a password first.";
        return;
      }

      const list = loadPasswords();
      list.push({
        account,
        password: pwd,
        createdAt: Date.now()
      });
      savePasswords(list);
      renderPasswordList();

      saveMessage.className = "success";
      saveMessage.textContent = "Saved!";
      accountNameInput.value = "";
    });

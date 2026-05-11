import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');

// Handle Admin Login Authorization
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        errorMsg.innerText = "برجاء إدخال البريد وكلمة المرور";
        errorMsg.classList.remove('hidden');
        return;
    }

    try {
        loginBtn.innerText = "جاري الدخول...";
        // Authenticate admin user via Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect to protected admin dashboard upon successful authentication
        window.location.href = "admin.html";
    } catch (error) {
        console.error(error);
        loginBtn.innerText = "دخول";
        errorMsg.innerText = "البريد أو كلمة المرور غير صحيحة!";
        errorMsg.classList.remove('hidden');
    }
});
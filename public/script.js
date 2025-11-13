// 🔄 Toggle between Login and Register
document.getElementById("showRegister").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
});

//📝 Handle Registration
// 📝 Handle Registration
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // ✅ Define the form element from the event
  const form = e.target;

  // ✅ Use querySelector safely within this form
  const userData = {
    name: form.querySelector('input[placeholder="Full Name"]').value,
    email: form.querySelector('input[placeholder="Email Address"]').value,
    bio: form.querySelector('textarea').value,
    username: form.querySelector('input[placeholder="User ID"]').value,
    password: form.querySelector('input[placeholder="Password"]').value,
    contact_number: form.querySelector('input[placeholder="Contact Number"]').value,
    location: form.querySelector('input[placeholder="Location"]').value,
  };

  try {
    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    document.querySelector("#register-answer").innerText = data.message;

    if (response.ok) {
      // ✅ Auto-switch to login after successful register
      setTimeout(() => {
        document.getElementById("registerBox").style.display = "none";
        document.getElementById("loginBox").style.display = "block";
      }, 1000);
    }

  } catch (error) {
    console.error("❌ Error during registration:", error);
    alert("Error connecting to server");
  }
});


// 🔐 Handle Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const credentials = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ Store user_id or email locally
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_email", credentials.email);

      // ✅ Redirect to addskills.html
      window.location.href = "addskills.html";
    } else {
      // Show backend message on page
      document.querySelector("#login-answer").innerText = data.message || "Login failed";
    }
  } catch (error) {
    console.error("❌ Error during login:", error);
    alert("Login failed. Please try again.");
  }
});

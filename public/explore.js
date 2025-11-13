document.addEventListener("DOMContentLoaded", async () => {
  const user_id = localStorage.getItem("user_id");
  if (!user_id) {
    alert("Please log in first!");
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/dashboard/${user_id}`);
    const data = await res.json();

    // Update logged-in user info
    document.querySelector("#user-info h2 span").innerText = data.user.name;
    document.querySelector("#user-info p:nth-of-type(1)").innerHTML =
      `<strong>Skills You Teach:</strong> ${data.teachSkills.join(", ") || "None"}`;
    document.querySelector("#user-info p:nth-of-type(2)").innerHTML =
      `<strong>Skills You Want to Learn:</strong> ${data.learnSkills.join(", ") || "None"}`;

    // --- Build Explore Section ---
    const container = document.querySelector(".service-box");
    container.innerHTML = "";

    // Group by user
    const grouped = {};
    data.explore.forEach(item => {
      if (!grouped[item.user_name]) grouped[item.user_name] = { teach: [], learn: [] };
      if (item.type === "Teach") grouped[item.user_name].teach.push(item.skill_name);
      else grouped[item.user_name].learn.push(item.skill_name);
    });

    // Create a card for each user
    Object.entries(grouped).forEach(([user_name, skills]) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${user_name}</h3>
        <p><strong>Wants to Teach:</strong> ${skills.teach.join(", ") || "None"}</p>
        <p><strong>Wants to Learn:</strong> ${skills.learn.join(", ") || "None"}</p>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
});

document.getElementById("skillForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Example: stored user_id after login
  const user_id = localStorage.getItem("user_id"); 
  if (!user_id) {
    alert("Please log in first!");
    return;
  }

  // Collect Learn Skill
  const learnSkill = {
    user_id,
    skill_name: document.getElementById("learn_skill_name").value.trim(),
    description: document.getElementById("learn_description").value.trim(),
    type: "Learn",
    experience_level: document.getElementById("learn_level").value
  };

  // Collect Teach Skill
  const teachSkill = {
    user_id,
    skill_name: document.getElementById("teach_skill_name").value.trim(),
    description: document.getElementById("teach_description").value.trim(),
    type: "Teach",
    experience_level: document.getElementById("teach_level").value
  };

  // Basic validation
  if (!learnSkill.skill_name || !learnSkill.description || !teachSkill.skill_name || !teachSkill.description) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/add-skill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ user_id, learnSkill, teachSkill }),
   });
 
    const result = await res.json();

    // Show message
    document.getElementById("skilladded").innerText = result.message || "Skills added successfully!";

    // Optional: redirect after success
    if (res.ok) setTimeout(() => window.location.href = "explore.html", 1500);

    // Clear the form
    document.getElementById("skillForm").reset();

  } catch (err) {
    console.error(err);
    alert("Error adding skills!");
  }
});

// Members list
const members = ["Sarwar", "Mou", "Soumitro", "Eti", "Musfiq"];

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  // Load initial data
  fetchPapers();

  // Handle form submission
  document.getElementById("paper-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const member = document.getElementById("member").value;
    const title = document.getElementById("paper-title").value;
    const link = document.getElementById("paper-link").value;
    const description = document.getElementById("description").value;

    if (!member || !title || !link) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch("/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member, title, link, description }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add paper");
      }
      await fetchPapers();
      alert("Paper added successfully!");
      document.getElementById("paper-form").reset();
      showView("all-papers");
    } catch (err) {
      console.error("Add paper error:", err);
      alert("Error adding paper: " + err.message);
    }
  });

  // Show dashboard by default
  showView("dashboard");
});

// Fetch papers from backend
async function fetchPapers() {
  try {
    const response = await fetch("/papers");
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch papers");
    }
    const papers = await response.json();
    console.log("Received papers:", papers); // Debug log
    if (!Array.isArray(papers)) {
      throw new Error("Expected an array of papers, got: " + typeof papers);
    }
    updateUI(papers);
  } catch (err) {
    console.error("Fetch papers error:", err);
    alert("Error loading papers: " + err.message);
    updateUI([]); // Fallback to empty array
  }
}

// Show specific view
function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  fetchPapers();
}

// Update all UI components
function updateUI(papers) {
  updateDashboard(papers);
  updateAllPapers(papers);
  members.forEach((member) => updateMemberTable(member, papers));
  updateCharts(papers);
}

// Update Dashboard
function updateDashboard(papers) {
  const totalPapers = papers.length;
  const originalPapers = papers.filter((p) => p.status === "Original").length;
  const duplicatePapers = papers.filter((p) => p.status === "Duplicate").length;

  document.getElementById("total-papers").textContent = totalPapers;
  document.getElementById("original-papers").textContent = originalPapers;
  document.getElementById("duplicate-papers").textContent = duplicatePapers;

  members.forEach((member) => {
    const count = papers.filter((p) => p.member === member).length;
    document.getElementById(`${member.toLowerCase()}-count`).textContent = count;
  });
}

// Update All Papers table
function updateAllPapers(papers) {
  const tbody = document.getElementById("all-papers-table");
  tbody.innerHTML = "";
  papers.forEach((paper) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td class="p-2">${paper.id}</td>
            <td class="p-2">${paper.member}</td>
            <td class="p-2">${paper.title}</td>
            <td class="p-2"><a href="${paper.link}" target="_blank" class="text-blue-600 underline">${
      paper.link
    }</a></td>
            <td class="p-2">${paper.description || ""}</td>
            <td class="p-2 status-${paper.status.toLowerCase()}">${paper.status}</td>
            <td class="p-2">${paper.dateAdded}</td>
        `;
    tbody.appendChild(row);
  });
}

// Update Member table
function updateMemberTable(member, papers) {
  const tbody = document.getElementById(`${member.toLowerCase()}-table`);
  tbody.innerHTML = "";
  const memberPapers = papers.filter((p) => p.member === member);
  memberPapers.forEach((paper) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td class="p-2">${paper.id}</td>
            <td class="p-2">${paper.title}</td>
            <td class="p-2"><a href="${paper.link}" target="_blank" class="text-blue-600 underline">${
      paper.link
    }</a></td>
            <td class="p-2">${paper.description || ""}</td>
            <td class="p-2 status-${paper.status.toLowerCase()}">${paper.status}</td>
            <td class="p-2">${paper.dateAdded}</td>
        `;
    tbody.appendChild(row);
  });
}

// Update Charts
function updateCharts(papers) {
  // Destroy existing charts to prevent overlap
  if (window.statusChart) window.statusChart.destroy();
  if (window.memberChart) window.memberChart.destroy();

  // Duplicate Status Chart
  const statusCtx = document.getElementById("status-chart").getContext("2d");
  window.statusChart = new Chart(statusCtx, {
    type: "pie",
    data: {
      labels: ["Original", "Duplicate"],
      datasets: [
        {
          data: [
            papers.filter((p) => p.status === "Original").length,
            papers.filter((p) => p.status === "Duplicate").length,
          ],
          backgroundColor: ["#c6efce", "#ffcccc"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Duplicate Status Distribution" },
      },
    },
  });

  // Member Distribution Chart
  const memberCtx = document.getElementById("member-chart").getContext("2d");
  window.memberChart = new Chart(memberCtx, {
    type: "pie",
    data: {
      labels: members,
      datasets: [
        {
          data: members.map((m) => papers.filter((p) => p.member === m).length),
          backgroundColor: ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "Papers by Member" },
      },
    },
  });
}

// Check Duplicates
async function checkDuplicates() {
  try {
    const response = await fetch("/check-duplicates", { method: "POST" });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to check duplicates");
    }
    const result = await response.json();
    await fetchPapers();
    alert(result.duplicatesFound > 0 ? `Found ${result.duplicatesFound} new duplicates.` : "No new duplicates found.");
  } catch (err) {
    console.error("Check duplicates error:", err);
    alert("Error checking duplicates: " + err.message);
  }
}

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

      // Add recent activity
      addRecentActivity(`${member} added a new paper: "${title}"`);

      // Go to dashboard
      showView("dashboard");
    } catch (err) {
      console.error("Add paper error:", err);
      alert("Error adding paper: " + err.message);
    }
  });

  // Set up modal form submission if it exists
  const modalForm = document.getElementById("modal-paper-form");
  if (modalForm) {
    modalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const member = document.getElementById("modal-member").value;
      const title = document.getElementById("modal-paper-title").value;
      const link = document.getElementById("modal-paper-link").value;
      const description = document.getElementById("modal-paper-description").value;

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

        // Reset form and close modal
        document.getElementById("modal-paper-form").reset();
        closeAddPaperModal();

        alert("Paper added successfully!");

        // Add recent activity
        addRecentActivity(`${member} added a new paper: "${title}"`);

        await fetchPapers();
      } catch (err) {
        console.error("Add paper error:", err);
        alert("Error adding paper: " + err.message);
      }
    });
  }

  // Initialize charts if they exist
  if (typeof Chart !== "undefined") {
    initializeCharts();
  }

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
  // Hide all views
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));

  // Show selected view
  document.getElementById(viewId).classList.add("active");

  // Update page title if element exists
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) {
    pageTitle.textContent = viewId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Update active nav link if they exist
  const navLinks = document.querySelectorAll(".nav-link");
  if (navLinks.length > 0) {
    navLinks.forEach((link) => link.classList.remove("active"));
    const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  // Refresh data
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

  // Update main counters
  if (document.getElementById("total-papers")) document.getElementById("total-papers").textContent = totalPapers;
  if (document.getElementById("original-papers"))
    document.getElementById("original-papers").textContent = originalPapers;
  if (document.getElementById("duplicate-papers"))
    document.getElementById("duplicate-papers").textContent = duplicatePapers;

  // Update member counters
  members.forEach((member) => {
    const count = papers.filter((p) => p.member === member).length;
    const counterElement = document.getElementById(`${member.toLowerCase()}-count`);
    if (counterElement) counterElement.textContent = count;

    // Update member view counter if exists
    const viewCountElement = document.getElementById(`${member.toLowerCase()}-count-view`);
    if (viewCountElement) viewCountElement.textContent = count;

    // Update progress bars if they exist
    const progressBar = document.getElementById(`${member.toLowerCase()}-progress`);
    if (progressBar) {
      const maxCount = Math.max(...members.map((m) => papers.filter((p) => p.member === m).length), 1);
      const percentage = (count / maxCount) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  });
}

// Update All Papers table
function updateAllPapers(papers) {
  const tbody = document.getElementById("all-papers-table");
  if (!tbody) return;

  tbody.innerHTML = "";
  papers.forEach((paper) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-2">${paper.id}</td>
      <td class="p-2">${paper.member}</td>
      <td class="p-2">${paper.title}</td>
      <td class="p-2"><a href="${paper.link}" target="_blank" class="text-blue-600 hover:underline">${shortenURL(
      paper.link
    )}</a></td>
      <td class="p-2">${paper.description || ""}</td>
      <td class="p-2 status-${paper.status.toLowerCase()}"><span class="status-badge ${
      paper.status === "Original" ? "status-original" : "status-duplicate"
    }">${paper.status}</span></td>
      <td class="p-2">${paper.dateAdded || paper.date}</td>
    `;
    tbody.appendChild(row);
  });
}

// Update Member table
function updateMemberTable(member, papers) {
  const tbody = document.getElementById(`${member.toLowerCase()}-table`);
  if (!tbody) return;

  tbody.innerHTML = "";
  const memberPapers = papers.filter((p) => p.member === member);
  memberPapers.forEach((paper) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-2">${paper.id}</td>
      <td class="p-2">${paper.title}</td>
      <td class="p-2"><a href="${paper.link}" target="_blank" class="text-blue-600 hover:underline">${shortenURL(
      paper.link
    )}</a></td>
      <td class="p-2">${paper.description || ""}</td>
      <td class="p-2 status-${paper.status.toLowerCase()}"><span class="status-badge ${
      paper.status === "Original" ? "status-original" : "status-duplicate"
    }">${paper.status}</span></td>
      <td class="p-2">${paper.dateAdded || paper.date}</td>
    `;
    tbody.appendChild(row);
  });
}

// Initialize charts
function initializeCharts() {
  // Status chart
  const statusCtx = document.getElementById("status-chart");
  if (statusCtx) {
    window.statusChart = new Chart(statusCtx.getContext("2d"), {
      type: "pie",
      data: {
        labels: ["Original", "Duplicate"],
        datasets: [
          {
            data: [0, 0],
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
  }

  // Member chart
  const memberCtx = document.getElementById("member-chart");
  if (memberCtx) {
    window.memberChart = new Chart(memberCtx.getContext("2d"), {
      type: "pie",
      data: {
        labels: members,
        datasets: [
          {
            data: members.map(() => 0),
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

  // Timeline chart
  const timelineCtx = document.getElementById("timeline-chart");
  if (timelineCtx) {
    window.timelineChart = new Chart(timelineCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Papers Over Time",
            data: [],
            borderColor: "#3b82f6",
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  // Performance chart
  const performanceCtx = document.getElementById("performance-chart");
  if (performanceCtx) {
    window.performanceChart = new Chart(performanceCtx.getContext("2d"), {
      type: "radar",
      data: {
        labels: ["Original Papers", "Total Submissions", "Unique Links", "Consistency", "Quality"],
        datasets: [
          {
            label: "Team Average",
            data: [0, 0, 0, 0, 0],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.2)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 10,
          },
        },
      },
    });
  }
}

// Update Charts
function updateCharts(papers) {
  // Skip if no papers or charts not initialized
  if (!papers || !papers.length) return;

  // Status chart
  if (window.statusChart) {
    const originalCount = papers.filter((p) => p.status === "Original").length;
    const duplicateCount = papers.filter((p) => p.status === "Duplicate").length;

    window.statusChart.data.datasets[0].data = [originalCount, duplicateCount];
    window.statusChart.update();
  }

  // Member Distribution Chart
  if (window.memberChart) {
    const memberCounts = members.map((m) => papers.filter((p) => p.member === m).length);
    window.memberChart.data.datasets[0].data = memberCounts;
    window.memberChart.update();
  }

  // Timeline chart
  if (window.timelineChart) {
    // Get all unique dates
    const dates = [...new Set(papers.map((p) => p.dateAdded || p.date))].sort();

    // Count papers for each date (cumulative)
    const cumulativeCounts = [];
    let count = 0;

    for (const date of dates) {
      count += papers.filter((p) => (p.dateAdded || p.date) === date).length;
      cumulativeCounts.push(count);
    }

    window.timelineChart.data.labels = dates;
    window.timelineChart.data.datasets[0].data = cumulativeCounts;
    window.timelineChart.update();
  }

  // Performance chart
  if (window.performanceChart) {
    const originalPapers = papers.filter((p) => p.status === "Original").length;
    const totalPapers = papers.length;
    const uniqueLinks = new Set(papers.map((p) => p.link)).size;
    const consistency = Math.min(10, papers.length > 0 ? 5 + 5 * (originalPapers / totalPapers) : 0);
    const quality = Math.min(10, papers.length > 0 ? 7 + Math.random() * 3 : 0);

    window.performanceChart.data.datasets[0].data = [originalPapers, totalPapers, uniqueLinks, consistency, quality];
    window.performanceChart.update();
  }
}

// Check Duplicates - Backend version
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

// Add recent activity entry
function addRecentActivity(text) {
  const recentActivity = document.getElementById("recent-activity");
  if (!recentActivity) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  const activityItem = document.createElement("div");
  activityItem.className = "flex items-start";
  activityItem.innerHTML = `
    <div class="bg-blue-100 p-2 rounded-full text-blue-500 mr-3">
      <i class="fas fa-file-alt"></i>
    </div>
    <div>
      <p class="font-medium">${text}</p>
      <p class="text-xs text-gray-400 mt-1">${timeStr}</p>
    </div>
  `;

  // Insert at the top
  recentActivity.insertBefore(activityItem, recentActivity.firstChild);
}

// Modal functions
function openAddPaperModal() {
  const modal = document.getElementById("add-paper-modal");
  if (modal) modal.classList.add("active");
}

function closeAddPaperModal() {
  const modal = document.getElementById("add-paper-modal");
  if (modal) modal.classList.remove("active");
}

function openAddPaperModalForMember(member) {
  const memberSelect = document.getElementById("modal-member");
  if (memberSelect) memberSelect.value = member;
  openAddPaperModal();
}

// Search papers
function searchPapers() {
  const searchInput = document.getElementById("search-papers");
  const statusFilter = document.getElementById("status-filter");
  if (!searchInput || !statusFilter) return;

  const searchTerm = searchInput.value.toLowerCase();
  const statusValue = statusFilter.value;

  const rows = document.getElementById("all-papers-table").querySelectorAll("tr");

  rows.forEach((row) => {
    if (!row.cells || row.cells.length < 6) return;

    const title = row.cells[2].textContent.toLowerCase();
    const member = row.cells[1].textContent.toLowerCase();
    const description = row.cells[4].textContent.toLowerCase();
    const status = row.cells[5].textContent;

    const matchesSearch = title.includes(searchTerm) || member.includes(searchTerm) || description.includes(searchTerm);

    const matchesStatus = statusValue === "all" || status === statusValue;

    if (matchesSearch && matchesStatus) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Filter papers by status - just calls search
function filterPapers() {
  searchPapers();
}

// Helper to shorten URLs for display
function shortenURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname.length > 15 ? urlObj.pathname.substring(0, 15) + "..." : urlObj.pathname);
  } catch (e) {
    return url.substring(0, 30) + (url.length > 30 ? "..." : "");
  }
}

// Add this to your existing script.js file
// Making sure the modal form submission closes the modal

document.getElementById("modal-paper-form").addEventListener("submit", function (e) {
  e.preventDefault();

  // Get form values
  const member = document.getElementById("modal-member").value;
  const title = document.getElementById("modal-paper-title").value;
  const link = document.getElementById("modal-paper-link").value;
  const description = document.getElementById("modal-paper-description").value;

  // Add the paper (assuming you have a function like this)
  addPaper(member, title, link, description);

  // Close the modal after submission
  closeAddPaperModal();

  // Reset the form
  this.reset();
});

// If you don't already have the closeAddPaperModal function, define it:
function closeAddPaperModal() {
  document.getElementById("add-paper-modal").style.display = "none";
}

// And for opening the modal:
function openAddPaperModal() {
  document.getElementById("add-paper-modal").style.display = "flex";
}

function openAddPaperModalForMember(member) {
  document.getElementById("modal-member").value = member;
  openAddPaperModal();
}

// Add this to your script.js file

// Delete Paper Modal Functions
function openDeletePaperModal(id, title) {
  document.getElementById("delete-paper-id").value = id;
  document.getElementById("delete-paper-title").textContent = title;
  document.getElementById("delete-paper-modal").classList.add("active");
  document.getElementById("verification-code").value = "";
  document.getElementById("verification-message").textContent = "";
}

function closeDeletePaperModal() {
  document.getElementById("delete-paper-modal").classList.remove("active");
}

async function deletePaper(e) {
  e.preventDefault();

  const id = document.getElementById("delete-paper-id").value;
  const verificationCode = document.getElementById("verification-code").value;

  if (!verificationCode) {
    document.getElementById("verification-message").textContent = "Please enter the verification code";
    document.getElementById("verification-message").classList.add("text-red-500");
    return;
  }

  try {
    const response = await fetch(`/papers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verificationCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      document.getElementById("verification-message").textContent = data.error || "Failed to delete paper";
      document.getElementById("verification-message").classList.add("text-red-500");
      return;
    }

    // Show success message
    document.getElementById("verification-message").textContent = "Paper deleted successfully!";
    document.getElementById("verification-message").classList.remove("text-red-500");
    document.getElementById("verification-message").classList.add("text-green-500");

    // Close modal after 1 second and refresh data
    setTimeout(() => {
      closeDeletePaperModal();
      loadPapers();
    }, 1000);
  } catch (err) {
    console.error("Error deleting paper:", err);
    document.getElementById("verification-message").textContent = "Error connecting to server";
    document.getElementById("verification-message").classList.add("text-red-500");
  }
}

// Add this to your existing renderPaper function to include a delete button
function renderPaper(paper, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="p-3">${paper.id}</td>
    ${tableId === "all-papers-table" ? `<td class="p-3">${paper.member}</td>` : ""}
    <td class="p-3">${paper.title}</td>
    <td class="p-3"><a href="${paper.link}" target="_blank" class="text-blue-600 hover:underline">${truncateLink(
    paper.link
  )}</a></td>
    <td class="p-3">${paper.description || ""}</td>
    <td class="p-3">
      <span class="status-badge ${
        paper.status === "Original" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }">
        ${paper.status}
      </span>
    </td>
    <td class="p-3">${paper.dateAdded}</td>
    <td class="p-3">
      ${
        paper.status === "Duplicate"
          ? `<button class="delete-btn text-red-600 hover:text-red-800" onclick="openDeletePaperModal(${
              paper.id
            }, '${paper.title.replace(/'/g, "\\'")}')">
          <i class="fas fa-trash"></i>
        </button>`
          : ""
      }
    </td>
  `;

  table.appendChild(row);
}

// Add event listener for the delete form
document.addEventListener("DOMContentLoaded", function () {
  // Your existing code here

  // Add event listener for delete form
  document.getElementById("delete-paper-form").addEventListener("submit", deletePaper);

  // Add Bangladesh time helper
  setInterval(updateBangladeshTime, 1000);
});

// Helper function to display current Bangladesh time
function updateBangladeshTime() {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
  const bdTime = new Date(now);

  const hours = bdTime.getHours().toString().padStart(2, "0");
  const minutes = bdTime.getMinutes().toString().padStart(2, "0");
  const currentCode = `${hours}${minutes}`;

  document.getElementById(
    "current-bd-time"
  ).textContent = `Current Bangladesh Time: ${hours}:${minutes} (Verification Code: ${currentCode})`;
}

// Make sure all tables have a header for the delete button
function updateTableHeaders() {
  const tables = ["all-papers-table", "sarwar-table", "mou-table", "soumitro-table", "eti-table", "musfiq-table"];

  tables.forEach((tableId) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headerRow = table.parentElement.querySelector("thead tr");
    if (!headerRow) return;

    // Check if Actions header already exists
    if (!headerRow.querySelector("th:last-child").textContent.includes("Actions")) {
      const actionsHeader = document.createElement("th");
      actionsHeader.className = "p-3";
      actionsHeader.textContent = "Actions";
      headerRow.appendChild(actionsHeader);
    }
  });
}

// Update existing loadPapers function to call updateTableHeaders
const originalLoadPapers = loadPapers;
loadPapers = async function () {
  await originalLoadPapers();
  updateTableHeaders();
};

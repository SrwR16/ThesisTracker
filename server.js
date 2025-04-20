const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas (Cluster0)"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Paper Schema
const paperSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  member: { type: String, required: true },
  title: { type: String, required: true },
  link: { type: String, required: true },
  description: String,
  status: { type: String, default: "Original" },
  dateAdded: { type: String, required: true },
});

const Paper = mongoose.model("Paper", paperSchema);

// Get all papers
app.get("/papers", async (req, res) => {
  try {
    const papers = await Paper.find().sort({ id: 1 });
    console.log("Fetched papers:", papers); // Debug log
    res.json(papers || []); // Ensure array, even if empty
  } catch (err) {
    console.error("Error fetching papers:", err);
    res.status(500).json({ error: "Failed to fetch papers", details: err.message });
  }
});

// Add a paper
app.post("/papers", async (req, res) => {
  try {
    const { member, title, link, description } = req.body;
    if (!member || !title || !link) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get next ID
    const lastPaper = await Paper.findOne().sort({ id: -1 });
    const id = lastPaper ? lastPaper.id + 1 : 1;

    // Check for duplicates
    const existing = await Paper.findOne({ $or: [{ title }, { link }] });
    const status = existing ? "Duplicate" : "Original";

    // Format date
    const dateAdded = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const paper = new Paper({ id, member, title, link, description, status, dateAdded });
    await paper.save();
    console.log("Added paper:", paper); // Debug log

    res.status(201).json(paper);
  } catch (err) {
    console.error("Error adding paper:", err);
    res.status(500).json({ error: "Failed to add paper", details: err.message });
  }
});

// Check duplicates
app.post("/check-duplicates", async (req, res) => {
  try {
    const papers = await Paper.find().sort({ id: 1 });
    let duplicatesFound = 0;

    for (let i = 0; i < papers.length; i++) {
      let isDuplicate = false;
      for (let j = 0; j < i; j++) {
        if (papers[j].title === papers[i].title || papers[j].link === papers[i].link) {
          isDuplicate = true;
          break;
        }
      }
      const oldStatus = papers[i].status;
      papers[i].status = isDuplicate ? "Duplicate" : "Original";
      if (oldStatus !== papers[i].status && isDuplicate) duplicatesFound++;
      await papers[i].save();
    }
    console.log("Checked duplicates, found:", duplicatesFound); // Debug log

    res.json({ duplicatesFound });
  } catch (err) {
    console.error("Error checking duplicates:", err);
    res.status(500).json({ error: "Failed to check duplicates", details: err.message });
  }
});

// Add this to your existing server.js file

// Delete a paper with verification
app.delete("/papers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationCode } = req.body;

    // Get Bangladesh time
    const bangladeshTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    });

    const bdTime = new Date(bangladeshTime);
    const hours = bdTime.getHours().toString().padStart(2, "0");
    const minutes = bdTime.getMinutes().toString().padStart(2, "0");
    const currentCode = `${hours}${minutes}`;

    // Validate verification code
    if (verificationCode !== currentCode) {
      return res.status(403).json({ error: "Invalid verification code" });
    }

    // Find and delete the paper
    const paper = await Paper.findOneAndDelete({ id: parseInt(id) });

    if (!paper) {
      return res.status(404).json({ error: "Paper not found" });
    }

    console.log("Deleted paper:", paper); // Debug log
    res.json({ success: true, message: "Paper deleted successfully" });
  } catch (err) {
    console.error("Error deleting paper:", err);
    res.status(500).json({ error: "Failed to delete paper", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

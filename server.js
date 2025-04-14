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
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch papers" });
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

    res.status(201).json(paper);
  } catch (err) {
    res.status(500).json({ error: "Failed to add paper" });
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

    res.json({ duplicatesFound });
  } catch (err) {
    res.status(500).json({ error: "Failed to check duplicates" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

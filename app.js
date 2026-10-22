
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Atlas Book Schema
const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    genre: {
      type: String,
      required: true,
      trim: true
    },
    publishedYear: {
      type: Number,
      required: true,
      min: 1,
      max: 2100
    }
  },
  {
    timestamps: true
  }
);

const Book = mongoose.model("Book", bookSchema);

// Validate book data
function validateBook(data) {
  const { title, author, genre, publishedYear } = data;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof author !== "string" ||
    !author.trim() ||
    typeof genre !== "string" ||
    !genre.trim() ||
    !Number.isInteger(publishedYear) ||
    publishedYear < 1 ||
    publishedYear > 2100
  ) {
    return "Provide a valid title, author, genre and publication year.";
  }

  return null;
}

// Home route: serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API health check
app.get("/api", (req, res) => {
  res.json({
    message: "Book Management API is running!",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

// GET: Retrieve all books
app.get("/api/books", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    console.error("Get books error:", error.message);
    res.status(500).json({ error: "Failed to retrieve books." });
  }
});

// GET: Retrieve one book by ID
app.get("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid book ID." });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found." });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error("Get book error:", error.message);
    res.status(500).json({ error: "Failed to retrieve book." });
  }
});

// POST: Create a new book
app.post("/api/books", async (req, res) => {
  try {
    const validationError = validateBook(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const book = await Book.create({
      title: req.body.title.trim(),
      author: req.body.author.trim(),
      genre: req.body.genre.trim(),
      publishedYear: req.body.publishedYear
    });

    res.status(201).json({
      message: "Book created successfully.",
      book
    });
  } catch (error) {
    console.error("Create book error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to create book." });
  }
});

// PUT: Update an existing book
app.put("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid book ID." });
    }

    const validationError = validateBook(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title.trim(),
        author: req.body.author.trim(),
        genre: req.body.genre.trim(),
        publishedYear: req.body.publishedYear
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found." });
    }

    res.status(200).json({
      message: "Book updated successfully.",
      book
    });
  } catch (error) {
    console.error("Update book error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to update book." });
  }
});

// DELETE: Delete a book
app.delete("/api/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid book ID." });
    }

    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found." });
    }

    res.status(200).json({
      message: "Book deleted successfully.",
      book
    });
  } catch (error) {
    console.error("Delete book error:", error.message);
    res.status(500).json({ error: "Failed to delete book." });
  }
});

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API route not found." });
});

// Handle malformed JSON
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }

  next(error);
});

// Connect to MongoDB Atlas and start the server
async function startServer() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing. Check your .env file.");
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("Connected to MongoDB Atlas successfully.");

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Book Management API running on port ${PORT}`);
      console.log(`Local URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();


const API_URL = "/api/books";

const bookGrid = document.getElementById("bookGrid");
const totalBooks = document.getElementById("totalBooks");
const totalAuthors = document.getElementById("totalAuthors");
const totalGenres = document.getElementById("totalGenres");
const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const notice = document.getElementById("notice");

const bookDialog = document.getElementById("bookDialog");
const bookForm = document.getElementById("bookForm");
const dialogTitle = document.getElementById("dialogTitle");
const submitBtn = document.getElementById("submitBtn");
const formError = document.getElementById("formError");
const confirmDialog = document.getElementById("confirmDialog");

let books = [];
let editingId = null;
let deletingId = null;
let noticeTimer;

// Display a message to the user
function showNotice(message, type = "success") {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;

  noticeTimer = setTimeout(() => {
    notice.hidden = true;
  }, 4000);
}

// Communicate with the Express API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data;
}

// Load all books from MongoDB through the API
async function loadBooks(showMessage = false) {
  loading.hidden = false;
  bookGrid.hidden = true;
  emptyState.hidden = true;

  try {
    const data = await apiRequest(API_URL);
    books = Array.isArray(data) ? data : (data.books || []);

    updateStats();
    updateGenreFilter();
    renderBooks();

    if (showMessage) {
      showNotice("Library refreshed successfully.");
    }
  } catch (error) {
    books = [];
    updateStats();
    updateGenreFilter();
    renderBooks();
    showNotice(`Could not load books: ${error.message}`, "error");
  } finally {
    loading.hidden = true;
  }
}

// Update dashboard statistics
function updateStats() {
  totalBooks.textContent = books.length;

  totalAuthors.textContent = new Set(
    books.map(book => book.author.trim().toLowerCase()).filter(Boolean)
  ).size;

  totalGenres.textContent = new Set(
    books.map(book => book.genre.trim().toLowerCase()).filter(Boolean)
  ).size;
}

// Populate genre filter while preserving the selection
function updateGenreFilter() {
  const previous = genreFilter.value;

  const genres = [...new Set(
    books.map(book => book.genre.trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  genreFilter.replaceChildren(new Option("All genres", ""));

  genres.forEach(genre => {
    genreFilter.add(new Option(genre, genre));
  });

  if (genres.includes(previous)) {
    genreFilter.value = previous;
  }
}

// Create an element with safe text content
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// Create each book card
function createBookCard(book, index) {
  const card = makeElement("article", "book-card", "");
  const cover = makeElement("div", "book-cover", "");
  const coverBook = makeElement(
    "div",
    `cover-book cover-${index % 5}`,
    ""
  );

  coverBook.append(
    makeElement("strong", "", book.title),
    makeElement("small", "", book.author)
  );

  cover.append(coverBook);

  const content = makeElement("div", "card-content", "");
  const genre = makeElement("span", "genre-tag", book.genre);
  const title = makeElement("h3", "book-title", book.title);
  const author = makeElement("p", "book-author", `By ${book.author}`);
  const year = makeElement("p", "book-year", `Published in ${book.publishedYear}`);

  const actions = makeElement("div", "card-actions", "");
  const editButton = makeElement("button", "btn btn-light", "Edit");
  const deleteButton = makeElement("button", "btn btn-light", "Delete");

  editButton.type = "button";
  deleteButton.type = "button";
  deleteButton.style.color = "#c43c49";

  editButton.addEventListener("click", () => openEditDialog(book));
  deleteButton.addEventListener("click", () => openDeleteDialog(book));

  actions.append(editButton, deleteButton);
  content.append(genre, title, author, year, actions);
  card.append(cover, content);

  return card;
}

// Render search and filter results
function renderBooks() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedGenre = genreFilter.value;

  const filteredBooks = books.filter(book => {
    const matchesSearch = [
      book.title,
      book.author,
      book.genre
    ].some(value => String(value).toLowerCase().includes(searchTerm));

    return matchesSearch &&
      (!selectedGenre || book.genre === selectedGenre);
  });

  bookGrid.replaceChildren();

  filteredBooks.forEach((book, index) => {
    bookGrid.append(createBookCard(book, index));
  });

  bookGrid.hidden = filteredBooks.length === 0;
  emptyState.hidden = filteredBooks.length !== 0;

  const emptyHeading = emptyState.querySelector("h3");
  const emptyText = emptyState.querySelector("p");

  if (books.length === 0) {
    emptyHeading.textContent = "Your library is empty";
    emptyText.textContent = "Add your first book to get started.";
  } else {
    emptyHeading.textContent = "No books found";
    emptyText.textContent = "Try another search or genre filter.";
  }
}

// Open the form for a new book
function openAddDialog() {
  editingId = null;
  bookForm.reset();
  dialogTitle.textContent = "Add a new book";
  submitBtn.textContent = "Save book";
  formError.hidden = true;
  bookDialog.showModal();
}

// Open the form with existing book details
function openEditDialog(book) {
  editingId = book._id;
  bookForm.reset();

  bookForm.elements.title.value = book.title;
  bookForm.elements.author.value = book.author;
  bookForm.elements.genre.value = book.genre;
  bookForm.elements.publishedYear.value = book.publishedYear;

  dialogTitle.textContent = "Edit book";
  submitBtn.textContent = "Save changes";
  formError.hidden = true;
  bookDialog.showModal();
}

// Add or update a book
bookForm.addEventListener("submit", async event => {
  event.preventDefault();

  const title = bookForm.elements.title.value.trim();
  const author = bookForm.elements.author.value.trim();
  const genre = bookForm.elements.genre.value.trim();
  const publishedYear = Number(bookForm.elements.publishedYear.value);

  if (!title || !author || !genre ||
      !Number.isInteger(publishedYear) ||
      publishedYear < 1 || publishedYear > 2100) {
    formError.textContent = "Enter valid book details and publication year.";
    formError.hidden = false;
    return;
  }

  const bookData = { title, author, genre, publishedYear };

  submitBtn.disabled = true;
  formError.hidden = true;

  try {
    if (editingId) {
      await apiRequest(`${API_URL}/${encodeURIComponent(editingId)}`, {
        method: "PUT",
        body: JSON.stringify(bookData)
      });

      bookDialog.close();
      showNotice("Book updated successfully.");
    } else {
      await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(bookData)
      });

      bookDialog.close();
      showNotice("Book added successfully.");
    }

    await loadBooks();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

// Ask for confirmation before deleting a book
function openDeleteDialog(book) {
  deletingId = book._id;
  document.getElementById("deleteMessage").textContent =
    `Delete "${book.title}" by ${book.author}? This cannot be undone.`;

  confirmDialog.hidden = false;
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  if (!deletingId) return;

  const button = document.getElementById("confirmDeleteBtn");
  button.disabled = true;

  try {
    await apiRequest(`${API_URL}/${encodeURIComponent(deletingId)}`, {
      method: "DELETE"
    });

    confirmDialog.hidden = true;
    deletingId = null;
    showNotice("Book deleted successfully.");
    await loadBooks();
  } catch (error) {
    confirmDialog.hidden = true;
    showNotice(`Could not delete book: ${error.message}`, "error");
  } finally {
    button.disabled = false;
  }
});

// Connect interface buttons and search controls
document.getElementById("addBookBtn").addEventListener("click", openAddDialog);
document.getElementById("emptyAddBtn").addEventListener("click", openAddDialog);

document.getElementById("closeDialog").addEventListener("click", () => {
  bookDialog.close();
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  bookDialog.close();
});

document.getElementById("keepBookBtn").addEventListener("click", () => {
  confirmDialog.hidden = true;
  deletingId = null;
});

searchInput.addEventListener("input", renderBooks);
genreFilter.addEventListener("change", renderBooks);

document.getElementById("refreshBtn").addEventListener("click", () => {
  loadBooks(true);
});

// Start the application
loadBooks();

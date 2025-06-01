// Change this line to your deployed backend URL
const apiUrl = 'https://community-library-api.onrender.com/api/v1'; // Update to deployed backend URL
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
let booksData = [];
let eventsData = [];

// Initialize UI
document.getElementById('userRole').textContent = `Role: ${role || 'Guest'}`;
if (role === 'admin') {
  document.getElementById('adminSection').classList.remove('hidden');
  document.getElementById('adminControls').classList.remove('hidden');
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = '/';
});

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
  localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});

// Apply saved theme
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-theme');
  document.body.classList.remove('dark-theme');
} else {
  document.body.classList.add('dark-theme');
  document.body.classList.remove('light-theme');
}

// Enhanced fetch function with error handling
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${apiUrl}/${endpoint}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    showToast(error.message || 'Network error occurred');
    throw error;
  }
}

// Show toast notifications
function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `toast ${type} fixed bottom-4 right-4 p-4 rounded-lg shadow-lg`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Populate books with search functionality
async function populateBooks(searchQuery = '') {
  try {
    if (!booksData.length) {
      booksData = await fetchData('books');
    }
    
    const booksList = document.getElementById('booksList');
    const filteredBooks = booksData.filter(book =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    booksList.innerHTML = filteredBooks.length > 0 
      ? filteredBooks.map(book => `
        <div class="card glass p-4 rounded-xl">
          ${book.image ? `<img src="${book.image}" alt="${book.title}" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
          <h3 class="font-bold text-lg">${book.title}</h3>
          <p class="text-gray-200">Author: ${book.author}</p>
          <p class="text-gray-200">Year: ${book.year}</p>
          ${book.description ? `<p class="text-gray-300 text-sm mt-2">${book.description}</p>` : ''}
          ${role === 'admin' ? `
            <div class="mt-4 flex">
              <button onclick="editBook('${book.id}')" class="btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg mr-2">Edit</button>
              <button onclick="deleteBook('${book.id}')" class="btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
            </div>
          ` : ''}
        </div>
      `).join('')
      : '<p class="text-center py-8">No books found matching your search</p>';
  } catch (error) {
    booksList.innerHTML = '<p class="text-center py-8">Error loading books</p>';
  }
}

// Populate events
async function populateEvents() {
  try {
    if (!eventsData.length) {
      eventsData = await fetchData('events');
    }
    
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = eventsData.map(event => `
      <div class="card glass p-4 rounded-xl">
        ${event.image ? `<img src="${event.image}" alt="${event.title}" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
        <h3 class="font-bold text-lg">${event.title}</h3>
        <p class="text-gray-200">Date: ${new Date(event.date).toLocaleDateString()}</p>
        <p class="text-gray-200">Location: ${event.location}</p>
        ${event.description ? `<p class="text-gray-300 text-sm mt-2">${event.description}</p>` : ''}
        <button onclick="showRegistration('${event.id}')" class="btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg mt-3">Register</button>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('eventsList').innerHTML = '<p class="text-center py-8">Error loading events</p>';
  }
}

// Setup charts
async function setupMonthlyBooksChart() {
  try {
    const monthlyBooks = await fetchData('stats/monthly-books');
    const ctx = document.getElementById('monthlyBooksChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(monthlyBooks),
        datasets: [{
          label: 'Books Added Per Year',
          data: Object.values(monthlyBooks),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: { 
        scales: { y: { beginAtZero: true } }, 
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } catch (error) {
    document.getElementById('monthlyBooksChart').closest('.chart-container').innerHTML = 
      '<p class="text-center py-8">Error loading chart data</p>';
  }
}

async function setupUserRolesChart() {
  try {
    const userRoles = await fetchData('stats/user-roles');
    const ctx = document.getElementById('userRolesChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(userRoles),
        datasets: [{
          label: 'User Roles',
          data: Object.values(userRoles),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
          borderWidth: 1
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } catch (error) {
    document.getElementById('userRolesChart').closest('.chart-container').innerHTML = 
      '<p class="text-center py-8">Error loading chart data</p>';
  }
}

// Form handlers
document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (role !== 'admin') return;

  try {
    const book = {
      title: document.getElementById('bookTitle').value,
      author: document.getElementById('bookAuthor').value,
      year: document.getElementById('bookYear').value,
      genre: document.getElementById('bookGenre').value,
      isbn: document.getElementById('bookIsbn').value,
      image: document.getElementById('bookImage').value,
      description: document.getElementById('bookDescription').value,
      addedDate: new Date().toISOString()
    };

    const response = await fetch(`${apiUrl}/books`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(book)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add book');
    }

    booksData = [];
    await populateBooks();
    e.target.reset();
    showToast('Book added successfully', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to add book');
  }
});

document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (role !== 'admin') return;

  try {
    const event = {
      title: document.getElementById('eventTitle').value,
      date: document.getElementById('eventDate').value,
      location: document.getElementById('eventLocation').value,
      image: document.getElementById('eventImage').value,
      description: document.getElementById('eventDescription').value,
      isUpcoming: new Date(document.getElementById('eventDate').value) >= new Date()
    };

    const response = await fetch(`${apiUrl}/events`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add event');
    }

    eventsData = [];
    await populateEvents();
    e.target.reset();
    showToast('Event added successfully', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to add event');
  }
});

// Book CRUD operations
async function editBook(id) {
  try {
    const book = await fetchData(`books/${id}`);
    
    // Fill form
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookYear').value = book.year;
    document.getElementById('bookGenre').value = book.genre;
    document.getElementById('bookIsbn').value = book.isbn;
    document.getElementById('bookImage').value = book.image || '';
    document.getElementById('bookDescription').value = book.description || '';
    
    // Update form handler
    const form = document.getElementById('bookForm');
    const originalHandler = form.onsubmit;
    
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      try {
        const updatedBook = {
          title: document.getElementById('bookTitle').value,
          author: document.getElementById('bookAuthor').value,
          year: document.getElementById('bookYear').value,
          genre: document.getElementById('bookGenre').value,
          isbn: document.getElementById('bookIsbn').value,
          image: document.getElementById('bookImage').value,
          description: document.getElementById('bookDescription').value
        };

        const response = await fetch(`${apiUrl}/books/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(updatedBook)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update book');
        }

        booksData = [];
        await populateBooks();
        form.reset();
        form.onsubmit = originalHandler;
        showToast('Book updated successfully', 'success');
      } catch (error) {
        showToast(error.message || 'Failed to update book');
      }
    };
  } catch (error) {
    showToast(error.message || 'Failed to load book details');
  }
}

async function deleteBook(id) {
  if (!confirm('Are you sure you want to delete this book?')) return;
  
  try {
    const response = await fetch(`${apiUrl}/books/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete book');
    }

    booksData = [];
    await populateBooks();
    showToast('Book deleted successfully', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to delete book');
  }
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
  populateBooks(e.target.value);
});

// Event registration
function showRegistration(eventId) {
  const event = eventsData.find(e => e.id === eventId);
  if (!event) return;

  const registrationDiv = document.getElementById('eventRegistration');
  document.getElementById('eventRegistrationTitle').textContent = `Register for: ${event.title}`;
  registrationDiv.classList.remove('hidden');
  
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    
    // In a real app, you would send this to your backend
    showToast(`Registration submitted for ${event.title}`, 'success');
    
    registrationDiv.classList.add('hidden');
    e.target.reset();
  };
}

// Initialize the page
async function initializePage() {
  try {
    await Promise.all([
      populateBooks(),
      populateEvents(),
      setupMonthlyBooksChart(),
      setupUserRolesChart()
    ]);
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Start the application
initializePage();
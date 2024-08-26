document.addEventListener('DOMContentLoaded', () => {
    // Check which page we're on and run appropriate functions
    if (document.getElementById('signupForm')) {
        document.getElementById('signupForm').addEventListener('submit', signup);
    } else if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', login);
    } else if (document.getElementById('profileName')) {
        loadProfile();
        setupEditProfile();
    }
    
    checkLoggedIn();
});

function signup(event) {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: password,
        gender: document.getElementById('gender').value,
        userType: document.getElementById('user-type').value
    };

    fetch('http://localhost:3000/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Sign up successful! Please log in.');
            window.location.href = 'login.html';
        } else {
            alert('Sign up failed: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Function to handle login
function login(event) {
    event.preventDefault();
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            loadUserInfo(); // Add this line
            alert('Login successful!');
            window.location.href = 'profile.html';
        } else {
            alert('Login failed: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}
//load user to chatbox
function loadUserInfo() {
    const token = localStorage.getItem('token');
    if (token) {
        fetch('http://localhost:3000/profile', {
            headers: {
                'Authorization': token
            }
        })
        .then(response => response.json())
        .then(data => {
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userProfilePic', data.profile_image ? 
                `http://localhost:3000/uploads/${data.profile_image}` : 
                'https://via.placeholder.com/30');
        })
        .catch(error => {
            console.error('Error loading user info:', error);
        });
    }
}
// Function to load user profile
function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    fetch('http://localhost:3000/profile', {
        headers: {
            'Authorization': token
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('profileName').textContent = data.name;
        document.getElementById('profileEmail').textContent = data.email;
        document.getElementById('profileGender').textContent = data.gender;
        document.getElementById('profileUserType').textContent = data.user_type;
        
        const profileImage = document.getElementById('profileImage');
        if (data.profile_image) {
            profileImage.src = `http://localhost:3000/uploads/${data.profile_image}`;
            profileImage.alt = "Profile Picture";
        } else {
            profileImage.src = "https://via.placeholder.com/150";
            profileImage.alt = "Default Profile Picture";
        }
    })
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
    });
    loadFullChatHistory();
}
document.addEventListener('DOMContentLoaded', function() {
    loadFullChatHistory();
});



function loadFullChatHistory() {
    const token = localStorage.getItem('token');
    const chatHistoryContent = document.getElementById('chatHistoryByDateForProfile');

    if (!chatHistoryContent) {
        console.error('Chat history container not found');
        return;
    }

    if (!token) {
        chatHistoryContent.innerHTML = `
            <p>You have no history. Do you want to <a href="login.html">login</a> or <a href="signup.html">register</a>?</p>
        `;
        return;
    }

    fetch('http://localhost:3000/chat-history', {
        headers: {
            'Authorization': token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (Object.keys(data).length === 0) {
            chatHistoryContent.innerHTML = '<p>No chat history available.</p>';
        } else {
            chatHistoryContent.innerHTML = '';
            Object.entries(data).forEach(([date, messages]) => {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'chat-history-date mb-3';
                dateDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="date-toggle" data-date="${date}">${date} <span class="toggle-icon">▼</span></h6>
                        <button class="btn btn-sm btn-danger delete-date" data-date="${date}">Delete Date</button>
                    </div>
                    <div class="date-content" style="display: none;">
                        ${messages.map(item => `
                            <div class="message-group">
                                <p><strong>You:</strong> ${escapeHtml(item.message)}</p>
                                <div><strong>4thROOM:</strong> ${parseResponse(item.response)}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                chatHistoryContent.appendChild(dateDiv);

                // Add event listener for toggling dates
                const toggle = dateDiv.querySelector('.date-toggle');
                toggle.addEventListener('click', function() {
                    const content = this.parentElement.nextElementSibling;
                    const icon = this.querySelector('.toggle-icon');
                    if (content.style.display === 'none') {
                        content.style.display = 'block';
                        icon.textContent = '▲';
                    } else {
                        content.style.display = 'none';
                        icon.textContent = '▼';
                    }
                });

                // Add event listener for delete button
                const deleteButton = dateDiv.querySelector('.delete-date');
                deleteButton.addEventListener('click', function() {
                    const dateToDelete = this.getAttribute('data-date');
                    if (confirm(`Are you sure you want to delete all conversations for ${dateToDelete}?`)) {
                        deleteConversationsByDate(dateToDelete);
                    }
                });
            });
        }
    })
    .catch(error => {
        console.error('Error loading chat history:', error);
        chatHistoryContent.innerHTML = '<p>Failed to load chat history.</p>';
    });
}


function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) {
        return '';
    }
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
function parseResponse(response) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(response, 'text/html');
    const images = doc.getElementsByTagName('img');
    
    for (let img of images) {
        const thumbnailSrc = img.src;
        const fullSrc = img.src;
        
        img.outerHTML = `
            <div class="image-container" style="margin-top: 10px;">
                <img src="${thumbnailSrc}" 
                     class="thumbnail-image" 
                     data-full-src="${fullSrc}" 
                     style="max-width: 100px; max-height: 100px; cursor: pointer;"
                     onerror="this.onerror=null; this.src='/path/to/fallback-image.jpg'; this.style.display='none';">
            </div>`;
    }

    return doc.body.innerHTML;
}
function openImageModal(src) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';

    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';

    img.onerror = function() {
        this.onerror = null;
        this.src = '/path/to/fallback-image.jpg';
        alert('Failed to load the full-size image.');
    };

    modal.appendChild(img);
    document.body.appendChild(modal);

    modal.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}

function deleteConversationsByDate(date) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to delete conversations.');
        return;
    }

    // Format the date as 'YYYY-MM-DD'
    const formattedDate = new Date(date).toISOString().split('T')[0];

    fetch(`http://localhost:3000/delete-conversations-by-date/${formattedDate}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Conversations deleted successfully.');
            loadFullChatHistory(); // Reload the chat history after deletion
        } else {
            alert('Failed to delete conversations: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting conversations:', error);
        alert('Failed to delete conversations. Please try again.');
    });
}

// Check if user is logged in
function checkLoggedIn() {
    const token = localStorage.getItem('token');
    const loginButton = document.querySelector('a[href="login.html"]');
    const logoutButton = document.getElementById('logoutButton');
    
    if (token) {
        if (loginButton) {
            loginButton.style.display = 'none';
        }
        if (logoutButton) {
            logoutButton.style.display = 'block';
        }
    } else {
        if (loginButton) {
            loginButton.style.display = 'block';
        }
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }
}

// Function to set up edit profile functionality
let cropper;

 function setupEditProfile() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        const profileImageInput = document.getElementById('profileImageInput');
        const cropperImage = document.getElementById('cropperImage');

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(editProfileModal);
                modal.show();
            });
        }

        if (profileImageInput) {
            profileImageInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (cropper) {
                            cropper.destroy();
                        }
                        if (cropperImage) {
                            cropperImage.src = e.target.result;
                            cropperImage.style.display = 'block';
                            cropper = new Cropper(cropperImage, {
                                aspectRatio: 1,
                                viewMode: 1,
                            });
                        } else {
                            console.error('Cropper image element not found');
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (editProfileForm) {
            editProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(editProfileForm);
                
                if (cropper) {
                    cropper.getCroppedCanvas().toBlob((blob) => {
                        formData.set('profileImage', blob, 'profile.jpg');
                        submitEditProfileForm(formData);
                    }, 'image/jpeg');
                } else {
                    submitEditProfileForm(formData);
                }
            });
        }
    }


// Function to submit edit profile form
async function submitEditProfileForm(formData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/edit-profile', {
            method: 'POST',
            headers: {
                'Authorization': token
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        alert(result.message);
        loadProfile();
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while updating your profile: ' + error.message);
    }
}



function checkLoggedIn() {
    const token = localStorage.getItem('token');
    const loginButton = document.getElementById('loginButton');
    const signupButton = document.getElementById('signupButton');
    const logoutButton = document.getElementById('logoutButton');
    const profileButton = document.getElementById('profileButton');

    if (token) {
        if (loginButton) loginButton.style.display = 'none';
        if (signupButton) signupButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        if (profileButton) profileButton.style.display = 'block';
    } else {
        if (loginButton) loginButton.style.display = 'block';
        if (signupButton) signupButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (profileButton) profileButton.style.display = 'none';
    }
}

// Attach logout function to logout button if it exists
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// Function to handle logout
function logout() {
    // Clear any session data (e.g., tokens)
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userProfilePic');

    // Redirect to the homepage
    window.location.href = 'index.html';
}
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
    loadChatHistory();
}
document.addEventListener('DOMContentLoaded', function() {
    loadChatHistory();
});

function loadChatHistory() {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('chatHistoryByDate').innerHTML = '<p>Please log in to view your chat history.</p>';
        return;
    }

    fetch('http://localhost:3000/chat-history', {
        headers: {
            'Authorization': token
        }
    })
    .then(response => response.json())
    .then(data => {
        const groupedHistory = groupHistoryByDate(data);
        const historyHtml = Object.entries(groupedHistory).map(([date, conversations]) => `
            <div class="chat-history-date mb-3">
                <h6>${date}</h6>
                ${conversations.map((conversation, index) => `
                    <div class="chat-history-conversation mb-2">
                        <a href="#" class="conversation-toggle" data-conversation-id="${conversation.id}">Conversation ${index + 1}</a>
                        <button class="btn btn-sm btn-danger delete-conversation" data-conversation-id="${conversation.id}">Delete</button>
                        <div class="conversation-content" style="display: none;">
                            ${conversation.messages.map(item => `
                                <p><strong>You:</strong> ${item.message}</p>
                                <p><strong>4thROOM:</strong> ${item.response}</p>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
        document.getElementById('chatHistoryByDate').innerHTML = historyHtml;

        // Add event listeners for toggling conversations
        document.querySelectorAll('.conversation-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const content = this.nextElementSibling.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            });
        });

        // Add event listeners for deleting conversations
        document.querySelectorAll('.delete-conversation').forEach(button => {
            button.addEventListener('click', function() {
                deleteConversation(this.dataset.conversationId);
            });
        });
    })
    .catch(error => {
        console.error('Error loading chat history:', error);
        document.getElementById('chatHistoryByDate').innerHTML = '<p>Failed to load chat history.</p>';
    });
}

function groupHistoryByDate(history) {
    const grouped = {};
    history.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(item);
    });
    return grouped;
}

function deleteConversation(conversationId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`http://localhost:3000/delete-conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadChatHistory();
        } else {
            alert('Failed to delete conversation: ' + data.error);
        }
    })
    .catch(error => console.error('Error deleting conversation:', error));
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
document.addEventListener('DOMContentLoaded', function() {
    displayWelcomeMessage();
    setupSidebarToggle();
    loadChatHistory();
});

function displayWelcomeMessage() {
    const welcomeMessage = "Welcome to 4thROOM! How can I assist you today?";
    displayMessage(welcomeMessage, 'chatbot-message');
}

function sendMessage() {
    const userInput = document.getElementById('userInput').value.trim();
    
    if (userInput === '') return;

    displayMessage(userInput, 'user-message');

    // Send message to server
    fetch('http://localhost:3000/chatbot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token')
        },
        body: JSON.stringify({ 
            message: userInput,
            sessionId: getSessionId()
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.isHtml) {
            displayMessage(data.answer, 'chatbot-message', true);
        } else {
            displayMessage(data.answer, 'chatbot-message');
        }
        
        // Save chat history
        saveChatHistory(userInput, data.answer);
        
        // Reload chat history
        loadChatHistory();
    })
    .catch(error => {
        console.error('Error sending message:', error)
    });

    // Clear input field
    document.getElementById('userInput').value = '';
}


function displayMessage(message, className, isHtml = false) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let sender = 'User';
    let profilePicSrc = 'https://via.placeholder.com/30'; // Default profile pic URL

    if (className === 'user-message') {
        sender = localStorage.getItem('userName') || 'User';
        profilePicSrc = localStorage.getItem('userProfilePic') || 'https://via.placeholder.com/30';
    } else if (className === 'chatbot-message') {
        sender = '4thROOM';
        profilePicSrc = 'path/to/chatbot-icon.png'; // Replace with actual chatbot icon
    }
    
    let messageContent = isHtml ? message : escapeHtml(message);
    let imageContent = '';
    
    // Check if the message contains an image tag
    if (messageContent.includes('<img')) {
        // Extract the image tag
        const imgMatch = messageContent.match(/<img[^>]+>/);
        if (imgMatch) {
            imageContent = imgMatch[0].replace(/<img/, '<img width="300" height="300" class="clickable-image"');
            // Remove the image tag from the message content
            messageContent = messageContent.replace(imgMatch[0], '');
        }
    }
    
    messageElement.innerHTML = `
        <img src="${profilePicSrc}" alt="${sender}" class="message-avatar" width="30" height="30">
        <div class="message-content">
            <span class="message-sender">${sender}</span>
            <div class="message-text">${messageContent}</div>
            <div class="message-image">${imageContent}</div>
            <span class="message-timestamp">${timestamp}</span>
        </div>
    `;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Add click listener to the new image
    const newImage = messageElement.querySelector('.clickable-image');
    if (newImage) {
        newImage.addEventListener('click', function() {
            const fullSizeImg = document.createElement('img');
            fullSizeImg.src = this.src;
            fullSizeImg.style.maxWidth = '90%';
            fullSizeImg.style.maxHeight = '90%';
            
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
            
            modal.appendChild(fullSizeImg);
            document.body.appendChild(modal);
            
            modal.addEventListener('click', function() {
                document.body.removeChild(modal);
            });
        });
    }
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

function saveChatHistory(message, response) {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:3000/save-chat-history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ message, response })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Chat history saved successfully');
        } else {
            console.error('Failed to save chat history');
        }
    })
    .catch(error => console.error('Error saving chat history:', error));
}


function getSessionId() {
    let sessionId = localStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now();
        localStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
}

function setupSidebarToggle() {
    const toggleButton = document.getElementById('toggle-sidebar');
    const unminimizeButton = document.getElementById('unminimize-sidebar');
    const sidebar = document.getElementById('chat-history-sidebar');
    const chatMain = document.querySelector('.chat-main');

    toggleButton.addEventListener('click', function() {
        minimizeSidebar();
    });

    unminimizeButton.addEventListener('click', function() {
        unminimizeSidebar();
    });

    function minimizeSidebar() {
        sidebar.classList.add('minimized');
        chatMain.classList.add('expanded');
        toggleButton.classList.add('d-none');
        unminimizeButton.classList.remove('d-none');
    }
    
    function unminimizeSidebar() {
        sidebar.classList.remove('minimized');
        chatMain.classList.remove('expanded');
        toggleButton.classList.remove('d-none');
        unminimizeButton.classList.add('d-none');
    }
}
function startNewConversation() {
    // Clear the messages div
    document.getElementById('messages').innerHTML = '';
    // Generate a new session ID
    localStorage.setItem('chatSessionId', 'session_' + Date.now());
    // Display welcome message
    displayWelcomeMessage();
}

// Add this to your DOMContentLoaded event listener
document.getElementById('newConversationBtn').addEventListener('click', startNewConversation);
//chathistory

function loadChatHistory() {
    const token = localStorage.getItem('token');
    const chatHistoryContent = document.getElementById('chatHistoryByDate');

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
            const today = new Date();
            const oneWeekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

            Object.entries(data).forEach(([date, messages]) => {
                const messageDate = new Date(date);
                if (messageDate >= oneWeekAgo && messageDate <= today) {
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'chat-history-date mb-3';
                    dateDiv.innerHTML = `
                        <h6 class="date-toggle" data-date="${date}">${date} <span class="toggle-icon">▼</span></h6>
                        <div class="date-content" style="display: none;">
                            ${messages.map(item => `
                                <p><strong>You:</strong> ${escapeHtml(item.message)}</p>
                                <div><strong>4thROOM:</strong> ${parseResponse(item.response)}</div>
                            `).join('')}
                        </div>
                    `;
                    chatHistoryContent.appendChild(dateDiv);

                    // Add event listener for toggling dates
                    const toggle = dateDiv.querySelector('.date-toggle');
                    toggle.addEventListener('click', function() {
                        const content = this.nextElementSibling;
                        const icon = this.querySelector('.toggle-icon');
                        if (content.style.display === 'none') {
                            content.style.display = 'block';
                            icon.textContent = '▲';
                        } else {
                            content.style.display = 'none';
                            icon.textContent = '▼';
                        }
                    });
                }
            });
        }
    })
    .catch(error => {
        console.error('Error loading chat history:', error);
        chatHistoryContent.innerHTML = '<p>Failed to load chat history.</p>';
    });
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
// Add event listener for Enter key
document.getElementById('userInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

window.loadChatHistory = loadChatHistory;


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
        console.error('Error sending message:', error);
        displayMessage('Sorry, there was an error processing your request.', 'chatbot-message');
    });

    // Clear input field
    document.getElementById('userInput').value = '';
}


function displayMessage(message, className) {
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
    
    messageElement.innerHTML = `
        <img src="${profilePicSrc}" alt="${sender}" class="message-avatar" width="30" height="30">
        <div class="message-content">
            <span class="message-sender">${sender}</span>
            <span class="message-text">${message}</span>
            <span class="message-timestamp">${timestamp}</span>
        </div>
    `;
    
    messagesDiv.appendChild(messageElement);

    // Scroll to the bottom of the messages div
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
    const chatHistoryContent = document.getElementById('chat-history-content');

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
    .then(response => response.json())
    .then(data => {
        if (data.length === 0) {
            chatHistoryContent.innerHTML = '<p>No chat history available.</p>';
        } else {
            const groupedHistory = groupHistoryByDate(data);
            const historyHtml = Object.entries(groupedHistory).map(([date, conversations]) => `
                <div class="chat-history-date">
                    <h6>${date}</h6>
                    ${conversations.map((conversation, index) => `
                        <div class="chat-history-conversation">
                            <a href="#" class="conversation-toggle" data-conversation-id="${conversation.id}">Conversation ${index + 1}</a>
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
            chatHistoryContent.innerHTML = historyHtml;

            // Add event listeners for toggling conversations
            document.querySelectorAll('.conversation-toggle').forEach(toggle => {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    const content = this.nextElementSibling;
                    content.style.display = content.style.display === 'none' ? 'block' : 'none';
                });
            });
        }
    })
    .catch(error => {
        console.error('Error loading chat history:', error);
        chatHistoryContent.innerHTML = '<p>Failed to load chat history.</p>';
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
// Add event listener for Enter key
document.getElementById('userInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const addQuestionForm = document.getElementById('addQuestionForm');
    if (addQuestionForm) {
        addQuestionForm.addEventListener('submit', function(event) {
            event.preventDefault();
            addQuestion();
        });
    }
    fetchQuestions(); 
    fetchUsers(); 
    loadUserCount();

    const editButton = document.getElementById('editButton');
    if (editButton) {
        editButton.addEventListener('click', function() {
            if (selectedRows.size === 1) {
                editQuestion(Array.from(selectedRows)[0]);
            } else if (selectedRows.size > 1) {
                alert('Please select only one question to edit at a time.');
            }
        });
    }

    const deleteButton = document.getElementById('deleteButton');
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            if (selectedRows.size > 0) {
                if (confirm(`Are you sure you want to delete ${selectedRows.size} question(s)?`)) {
                    deleteQuestions(Array.from(selectedRows));
                }
            }
        });
    }

    const editQuestionForm = document.getElementById('editQuestionForm');
    if (editQuestionForm) {
        editQuestionForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateQuestion();
        });
    }

    const closePopupButton = document.querySelector('.close-popup');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', closePopup);
    }

    const editPopup = document.getElementById('editPopup');
    if (editPopup) {
        editPopup.addEventListener('click', function(event) {
            if (event.target === this) {
                closePopup();
            }
        });
    }
    const expandableTextareas = document.querySelectorAll('.expandable-textarea');
    expandableTextareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        textarea.dispatchEvent(new Event('input'));
    });

    
});

let selectedRows = new Set();

function fetchQuestions(department) {
    fetch(`http://localhost:3000/questions${department ? `?department=${department}` : ''}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const questionsTable = document.getElementById('questionsTable');
            if (questionsTable) {
                const tbody = questionsTable.querySelector('tbody');
                if (tbody) {
                    tbody.innerHTML = '';
                    data.forEach(record => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><input type="checkbox" class="rowSelector" data-id="${record.id}"></td>
                            <td>${record.id}</td>
                            <td>${record.question}</td>
                            <td>${record.answer}</td>
                            <td>${record.keywords}</td>
                            <td>${record.department}</td>
                            <td>${record.image_data ? 
                                `<img src="data:image/jpeg;base64,${record.image_data}" alt="Question image" width="50" height="50" class="clickable-image">` : 
                                'No image'}
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                    addCheckboxListeners();
                    addImageClickListeners();
                    updateButtonStates();
                }
            }
        })
        .catch(error => {
            console.error('Error fetching questions:', error);
            alert('Error fetching questions. Please check the console for details.');
        });
}

function addImageClickListeners() {
    const images = document.querySelectorAll('.clickable-image');
    images.forEach(img => {
        img.addEventListener('click', function() {
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
    });
}

function addCheckboxListeners() {
    const rowSelectors = document.querySelectorAll('.rowSelector');
    rowSelectors.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const id = this.getAttribute('data-id');
            if (this.checked) {
                selectedRows.add(id);
            } else {
                selectedRows.delete(id);
            }
            updateButtonStates();
        });
    });

    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.rowSelector');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                const id = cb.getAttribute('data-id');
                if (this.checked) {
                    selectedRows.add(id);
                } else {
                    selectedRows.delete(id);
                }
            });
            updateButtonStates();
        });
    }
}

function updateButtonStates() {
    const editButton = document.getElementById('editButton');
    const deleteButton = document.getElementById('deleteButton');
    if (editButton && deleteButton) {
        const isAnySelected = selectedRows.size > 0;
        editButton.disabled = !isAnySelected;
        deleteButton.disabled = !isAnySelected;
    }
}

function addQuestion() {
    const form = document.getElementById('addQuestionForm');
    const formData = new FormData(form);

    // Log form data for debugging
    for (let [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `File: ${value.name}` : value);
    }

    // Validate form data
    const question = formData.get('question');
    const answer = formData.get('answer');
    const keywords = formData.get('keywords');
    const department = formData.get('department');
    const imageFile = formData.get('image');

    if (!question || !answer || !department) {
        alert('Please fill in all required fields (Question, Answer, and Department)');
        return;
    }

    // Show loading indicator
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    fetch('http://localhost:3000/add-question', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Question added successfully');
            fetchQuestions(department);
            form.reset();
            alert('Question added successfully!');
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    })
    .catch(error => {
        console.error('Error adding question:', error);
        alert(`Error adding question: ${error.message}`);
    })
    .finally(() => {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    });
}

function editQuestion(id) {
    fetch(`http://localhost:3000/questions`)
        .then(response => response.json())
        .then(data => {
            const question = data.find(q => q.id == id);
            if (question) {
                const editId = document.getElementById('editId');
                const editQuestion = document.getElementById('editQuestion');
                const editAnswer = document.getElementById('editAnswer');
                const editKeywords = document.getElementById('editKeywords');
                if (editId && editQuestion && editAnswer && editKeywords) {
                    editId.value = question.id;
                    editQuestion.value = question.question;
                    editAnswer.value = question.answer;
                    editKeywords.value = question.keywords;
                    showPopup();
                }
            } else {
                console.error('Question not found');
            }
        })
        .catch(error => console.error('Error fetching question for edit:', error));
}

function deleteQuestions(ids) {
    if (ids.length === 0) return;

    fetch('http://localhost:3000/delete-question', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: ids })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        fetchQuestions();
        selectedRows.clear();
        updateButtonStates();
    })
    .catch(error => {
        console.error('Error deleting questions:', error);
        alert('There was an error deleting the questions. Please try again.');
    });
}

function updateQuestion() {
    const editId = document.getElementById('editId');
    const editQuestion = document.getElementById('editQuestion');
    const editAnswer = document.getElementById('editAnswer');
    const editKeywords = document.getElementById('editKeywords');

    if (editId && editQuestion && editAnswer && editKeywords) {
        const id = editId.value;
        const question = editQuestion.value;
        const answer = editAnswer.value;
        const keywords = editKeywords.value;

        fetch('http://localhost:3000/update-question', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, question, answer, keywords })
        })
        .then(response => response.json())
        .then(() => {
            fetchQuestions();
            closePopup();
        })
        .catch(error => console.error('Error updating question:', error));
    }
}

function showPopup() {
    const editPopup = document.getElementById('editPopup');
    if (editPopup) {
        editPopup.classList.add('active');
    }
}

function closePopup() {
    const editPopup = document.getElementById('editPopup');
    if (editPopup) {
        editPopup.classList.remove('active');
    }
}

function fetchUsers() {
    fetch('http://localhost:3000/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const usersTable = document.getElementById('usersTable');
                if (usersTable) {
                    const tbody = usersTable.querySelector('tbody');
                    if (tbody) {
                        tbody.innerHTML = '';
                        data.users.forEach(user => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td><input type="checkbox" class="userSelector" data-id="${user.id}"></td>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>${user.gender}</td>
                                <td>${user.user_type}</td>
                            `;
                            tbody.appendChild(row);
                        });
                        addCheckboxListeners();
                        updateDeleteButtonState();
                        updateUserCount(data.users.length);
                    } else {
                        console.error('tbody not found in usersTable');
                    }
                } else {
                    console.error('usersTable not found');
                }
            } else {
                console.error('Failed to fetch users');
            }
        })
        .catch(error => console.error('Error fetching users:', error));
}

function updateUserCount(count) {
    const userCountElement = document.getElementById('userCount');
    if (userCountElement) {
        userCountElement.textContent = count;
    }
}

function loadUserCount() {
    fetch('http://localhost:3000/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const userCount = data.users.length;
                updateUserCount(userCount);
            } else {
                updateUserCount('Error');
            }
        })
        .catch(error => {
            console.error('Error fetching user count:', error);
            updateUserCount('Error');
        });
}


document.addEventListener('DOMContentLoaded', function() {
    const postEventForm = document.getElementById('postEventForm');
    if (postEventForm) {
        postEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(postEventForm);
            
            fetch('http://localhost:3000/post-event', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert(result.message);
                    postEventForm.reset();
                    loadEvents(); // Refresh the events list
                } else {
                    throw new Error(result.message);
                }
            })
            .catch(error => {
                console.error('Error posting event:', error);
                alert('Error posting event: ' + error.message);
            });
        });
    }



    
    function loadEvents() {
        fetch('http://localhost:3000/events')
            .then(response => response.json())
            .then(events => {
                const eventsTable = document.querySelector('.manage-events table tbody');
                if (eventsTable) {
                    eventsTable.innerHTML = '';
                    events.forEach(event => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${event.title}</td>
                            <td>${event.description.substring(0, 50)}...</td>
                            <td>${new Date(event.event_date).toLocaleString()}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteEvent(${event.id})">Delete</button>
                            </td>
                        `;
                        eventsTable.appendChild(row);
                    });
                } else {
                    console.error('Events table not found');
                }
            })
            .catch(error => console.error('Error fetching events:', error));
    }

    loadEvents(); // Initial load of events
});

function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        fetch(`http://localhost:3000/remove-event/${eventId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert(result.message);
                    loadEvents(); // Refresh the events list
                } else {
                    throw new Error(result.message);
                }
            })
            .catch(error => {
                console.error('Error deleting event:', error);
                alert('Error deleting event: ' + error.message);
            });
    }
}
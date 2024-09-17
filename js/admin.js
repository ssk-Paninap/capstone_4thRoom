document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('DOMContentLoaded', function() {
        const toggler = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
    
        toggler.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            if (window.innerWidth <= 768) {
                mainContent.style.marginLeft = sidebar.classList.contains('show') ? '250px' : '0';
            }
        });
    
        // Adjust layout on window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mainContent.style.marginLeft = '250px';
                sidebar.classList.remove('show');
            } else {
                mainContent.style.marginLeft = sidebar.classList.contains('show') ? '250px' : '0';
            }
        });
    });
    fetchUsers(); 
    loadUserCount(); 
    document.getElementById('editUserForm').addEventListener('submit', handleEditUserSubmit);
});



function fetchUsers() {
    fetch('http://localhost:3000/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.querySelector('#usersTable tbody');
                tbody.innerHTML = '';
                data.users.forEach(user => {
                    const row = `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.gender}</td>
                            <td>${user.user_type}</td>
                            <td>
                                <span class="password-hidden">********</span>
                                <span class="password-visible" style="display:none;">${user.password}</span>
                                <button class="btn btn-sm btn-link toggle-password">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                            <td>
                                <button class="btn btn-primary btn-sm edit-user" data-id="${user.id}">Edit</button>
                                <button class="btn btn-danger btn-sm delete-user" data-id="${user.id}">Delete</button>
                            </td>
                        </tr>
                    `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
                addButtonListeners();
            } else {
                console.error('Failed to fetch users');
            }
        })
        .catch(error => console.error('Error fetching users:', error));
}

function addButtonListeners() {
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });

    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            deleteUser(userId);
        });
    });

    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const passwordHidden = this.parentElement.querySelector('.password-hidden');
            const passwordVisible = this.parentElement.querySelector('.password-visible');
            const icon = this.querySelector('i');
            if (passwordHidden.style.display !== 'none') {
                passwordHidden.style.display = 'none';
                passwordVisible.style.display = 'inline';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordHidden.style.display = 'inline';
                passwordVisible.style.display = 'none';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

function editUser(userId) {
    fetch(`http://localhost:3000/users/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const user = data.user;
                document.getElementById('editUserId').value = user.id;
                document.getElementById('editName').value = user.name;
                document.getElementById('editEmail').value = user.email;
                document.getElementById('editGender').value = user.gender;
                document.getElementById('editUserType').value = user.user_type;
                document.getElementById('editPassword').value = '';
                $('#editUserModal').modal('show');
            } else {
                console.error('Failed to fetch user details');
            }
        })
        .catch(error => console.error('Error fetching user details:', error));
}

function handleEditUserSubmit(event) {
    event.preventDefault();
    const userId = document.getElementById('editUserId').value;
    const userData = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        gender: document.getElementById('editGender').value,
        user_type: document.getElementById('editUserType').value,
        password: document.getElementById('editPassword').value
    };

    fetch(`http://localhost:3000/update-user/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#editUserModal').modal('hide');
            fetchUsers();
        } else {
            alert('Failed to update user');
        }
    })
    .catch(error => console.error('Error updating user:', error));
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        fetch(`http://localhost:3000/delete-user/${userId}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchUsers();
                } else {
                    alert('Failed to delete user');
                }
            })
            .catch(error => console.error('Error deleting user:', error));
    }
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




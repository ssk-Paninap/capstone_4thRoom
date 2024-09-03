document.addEventListener('DOMContentLoaded', function() {
    const addAdminForm = document.getElementById('addAdminForm');
    let permissionsModal;

    addAdminForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('adminName').value;
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        fetch('http://localhost:3000/add-secondary-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ name, email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Secondary admin added successfully');
                addAdminForm.reset();
                loadSecondaryAdmins();
            } else {
                alert('Failed to add secondary admin: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    function loadSecondaryAdmins() {
        fetch('http://localhost:3000/secondary-admins', {
            headers: {
                'Authorization': localStorage.getItem('adminToken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const adminList = document.getElementById('adminList');
                adminList.innerHTML = '';
                data.admins.forEach(admin => {
                    const row = `
                        <tr>
                            <td>${admin.name}</td>
                            <td>${admin.email}</td>
                            <td>Secondary Admin</td>
                            <td><button onclick="editPermissions(${admin.id})" class="btn btn-sm btn-info">Edit Permissions</button></td>
                            <td><button onclick="deleteAdmin(${admin.id})" class="btn btn-sm btn-danger">Delete</button></td>
                        </tr>
                    `;
                    adminList.innerHTML += row;
                });
            } else {
                alert('Failed to load secondary admins');
            }
        })
        .catch(error => console.error('Error:', error));
    }
    
    window.editPermissions = function(adminId) {
        fetch(`http://localhost:3000/admin/user-permissions/${adminId}`, {
            headers: {
                'Authorization': localStorage.getItem('adminToken')
            }
        })
        .then(response => response.json())
        .then(data => {
            // Reset all checkboxes
            document.querySelectorAll('#permissionsForm input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Check the boxes for the permissions the admin has
            data.permissions.forEach(permission => {
                const checkbox = document.getElementById(`${permission}Permission`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            permissionsModal = new bootstrap.Modal(document.getElementById('permissionsModal'));
            permissionsModal.show();
    
            document.getElementById('savePermissions').onclick = function() {
                const permissions = Array.from(document.querySelectorAll('#permissionsForm input:checked')).map(input => input.value);
                savePermissions(adminId, permissions);
            };
        })
        .catch(error => console.error('Error:', error));
    }
    
    function savePermissions(adminId, permissions) {
        fetch('http://localhost:3000/admin/set-user-permissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ userId: adminId, permissions: permissions })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Permissions updated successfully');
                if (permissionsModal) {
                    permissionsModal.hide();
                }
            } else {
                alert('Failed to update permissions: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    window.deleteAdmin = function(adminId) {
        if (confirm('Are you sure you want to delete this admin?')) {
            fetch(`http://localhost:3000/delete-secondary-admin/${adminId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': localStorage.getItem('adminToken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Secondary admin deleted successfully');
                    loadSecondaryAdmins();
                } else {
                    alert('Failed to delete secondary admin: ' + data.message);
                }
            })
            .catch(error => console.error('Error:', error));
        }
    }

    // Load secondary admins when page loads
    loadSecondaryAdmins();
});
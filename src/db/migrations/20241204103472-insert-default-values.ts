import { QueryInterface, QueryTypes } from 'sequelize';

// Define types for roles and permissions based on their schema
interface Role {
  id: number;
  name: string;
  description: string;
}

interface Permission {
  id: number;
  action: string;
  description: string;
  groupName: string;
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  const dialect = (process.env.SQL_TYPE ?? 'postgres').toLowerCase();
  const now = new Date();

  const rolesTable = dialect === 'postgres' ? '"Roles"' : 'Roles';
  const permissionsTable = dialect === 'postgres' ? '"Permissions"' : 'Permissions';
  const rolePermissionsTable = dialect === 'postgres' ? '"RolePermissions"' : 'RolePermissions';
  const usersTable = dialect === 'postgres' ? '"Users"' : 'Users';

  try {
    // 1. Check and insert Admin Role
    const existingRoles = (await queryInterface.sequelize.query(
      `SELECT * FROM ${rolesTable} WHERE name = 'admin'`,
      { type: QueryTypes.SELECT }
    )) as Role[];

    if (existingRoles.length === 0) {
      await queryInterface.bulkInsert('Roles', [
        { name: 'admin', description: 'Administrator role', createdAt: now, updatedAt: now }
      ]);
    }

    const roles = (await queryInterface.sequelize.query(`SELECT * FROM ${rolesTable}`, {
      type: QueryTypes.SELECT
    })) as Role[];

    const adminRole = roles.find((r) => r.name === 'admin');

    // 2. Check and insert Permissions
    const permissionsToInsert = [
      { action: 'CreateRole', description: 'Create a new role', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'CreatePermission', description: 'Create a new permission', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'UpdateRole', description: 'Update an existing role', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'UpdatePermission', description: 'Update an existing permission', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'DeleteRole', description: 'Delete a role', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'DeletePermission', description: 'Delete a permission', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'GetRole', description: 'Get details of a role', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'GetPermission', description: 'Get details of a permission', groupName: 'Role & Permission', createdAt: now, updatedAt: now },
      { action: 'CreateUser', description: 'Create a new user', groupName: 'User Management', createdAt: now, updatedAt: now },
      { action: 'GetUser', description: 'Get details of a user', groupName: 'User Management', createdAt: now, updatedAt: now },
      { action: 'UpdateUser', description: 'update an existing user', groupName: 'User Management', createdAt: now, updatedAt: now },
      { action: 'DeleteUser', description: 'update an existing user', groupName: 'User Management', createdAt: now, updatedAt: now }
    ];

    const existingPermissions = (await queryInterface.sequelize.query(
      `SELECT * FROM ${permissionsTable}`,
      { type: QueryTypes.SELECT }
    )) as Permission[];

    const existingActions = new Set(existingPermissions.map((p) => p.action));
    const newPermissions = permissionsToInsert.filter((p) => !existingActions.has(p.action));

    if (newPermissions.length > 0) {
      await queryInterface.bulkInsert('Permissions', newPermissions);
    }

    const allPermissions = (await queryInterface.sequelize.query(
      `SELECT * FROM ${permissionsTable}`,
      { type: QueryTypes.SELECT }
    )) as Permission[];

    // 3. Check and insert RolePermissions
    if (adminRole) {
      const existingRolePermissions = (await queryInterface.sequelize.query(
        `SELECT * FROM ${rolePermissionsTable} WHERE "roleId" = ${adminRole.id}`,
        { type: QueryTypes.SELECT }
      )) as any[];

      const existingPermissionIds = new Set(existingRolePermissions.map((rp) => rp.permissionId));
      const rolePermissionsToInsert = [];

      for (const permission of allPermissions) {
        if (!existingPermissionIds.has(permission.id)) {
          rolePermissionsToInsert.push({
            roleId: adminRole.id,
            permissionId: permission.id,
            createdAt: now,
            updatedAt: now
          });
        }
      }

      if (rolePermissionsToInsert.length > 0) {
        await queryInterface.bulkInsert('RolePermissions', rolePermissionsToInsert);
      }
    }

    // 4. Check and insert Admin User
    if (adminRole) {
      const existingUsers = (await queryInterface.sequelize.query(
        `SELECT * FROM ${usersTable} WHERE email = 'admin@gmail.com'`,
        { type: QueryTypes.SELECT }
      )) as any[];

      if (existingUsers.length === 0) {
        await queryInterface.bulkInsert('Users', [
          {
            firstName: 'Admin',
            lastName: 'Admin',
            email: 'admin@gmail.com',
            password: '$2a$10$9cFjJrHMWhCIxBmLojl19eOsOoiWviYb7AYHuc39rI65CVGp7aSX2', // Admin@123
            roleId: adminRole.id,
            accountStatus: 'active',
            createdAt: now,
            updatedAt: now
          }
        ]);
      }
    }
  } catch (error) {
    console.error('Migration 20241204103472-insert-default-values failed with error:', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('Users', { email: 'admin@gmail.com' });
  await queryInterface.bulkDelete('RolePermissions', {});
  await queryInterface.bulkDelete('Permissions', {});
  await queryInterface.bulkDelete('Roles', { name: 'admin' });
}


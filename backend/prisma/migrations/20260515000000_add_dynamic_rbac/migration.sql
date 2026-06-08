-- CreateDynamicRolesAndPermissions
CREATE TABLE "dynamic_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "dynamic_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dynamic_roles_name_key" ON "dynamic_roles"("name");

-- CreatePermissions
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateDynamicRolePermissions
CREATE TABLE "dynamic_role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dynamic_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dynamic_role_permissions_role_id_permission_id_key" ON "dynamic_role_permissions"("role_id", "permission_id");

-- CreateUserDynamicRoles
CREATE TABLE "user_dynamic_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_dynamic_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_dynamic_roles_user_id_role_id_key" ON "user_dynamic_roles"("user_id", "role_id");

-- Add foreign key constraints
ALTER TABLE "dynamic_role_permissions" ADD CONSTRAINT "dynamic_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "dynamic_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dynamic_role_permissions" ADD CONSTRAINT "dynamic_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_dynamic_roles" ADD CONSTRAINT "user_dynamic_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_dynamic_roles" ADD CONSTRAINT "user_dynamic_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "dynamic_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create missing roles_permissions table for legacy RBAC
DROP TABLE IF EXISTS "roles_permissions";
CREATE TABLE "roles_permissions" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_permissions_role_permission_key_key" ON "roles_permissions"("role", "permission_key");

import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString() name: string;
  @IsString() displayName: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() priority?: number;
}

export class UpdateRoleDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() priority?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreatePermissionDto {
  @IsString() key: string;
  @IsString() displayName: string;
  @IsOptional() @IsString() description?: string;
  @IsString() category: string;
}

export class UpdatePermissionDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetPermissionsDto {
  @IsArray() @IsString({ each: true }) permissionIds: string[];
}

export class SetUserRolesDto {
  @IsArray() @IsString({ each: true }) roleIds: string[];
}

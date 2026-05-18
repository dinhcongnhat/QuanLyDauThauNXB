import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { DocumentLibraryService } from './document-library.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, LibraryType, FieldType } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, MinLength, Allow } from 'class-validator';

class CreateOrganizationDto {
  @IsString() @MinLength(1) ten: string;
  @IsOptional() @IsString() moTa?: string;
}

class UpdateOrganizationDto {
  @IsOptional() @IsString() ten?: string;
  @IsOptional() @IsString() moTa?: string;
}

class CreateLibraryDto {
  @IsString() @MinLength(1) ten: string;
  @IsEnum(LibraryType) loai: LibraryType;
  @IsString() @MinLength(1) organizationId: string;
}

class UpdateLibraryDto {
  @IsOptional() @IsString() ten?: string;
  @IsOptional() @IsEnum(LibraryType) loai?: LibraryType;
}

class CreateFieldDto {
  @IsString() @MinLength(1) tenTruong: string;
  @IsString() @MinLength(1) khoa: string;
  @IsEnum(FieldType) kieuDuLieu: FieldType;
  @IsOptional() @IsString() giaTriMacDinh?: string;
  @IsOptional() @IsBoolean() batBuoc?: boolean;
  @IsOptional() @IsNumber() thuTu?: number;
  @IsOptional() @IsString() nhom?: string;
}

class UpdateFieldDto {
  @IsOptional() @IsString() tenTruong?: string;
  @IsOptional() @IsString() khoa?: string;
  @IsOptional() @IsEnum(FieldType) kieuDuLieu?: FieldType;
  @IsOptional() @IsString() giaTriMacDinh?: string;
  @IsOptional() @IsBoolean() batBuoc?: boolean;
  @IsOptional() @IsNumber() thuTu?: number;
  @IsOptional() @IsString() nhom?: string;
}

class SaveValueDto {
  @IsString() @MinLength(1) tenGiaTri: string;
  @Allow() duLieu: Record<string, any>;
}

class UpdateValueDto {
  @IsOptional() @IsString() tenGiaTri?: string;
  @Allow() duLieu?: Record<string, any>;
}

@Controller('document-library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentLibraryController {
  constructor(private service: DocumentLibraryService) {}

  // Organization
  @Get('organization')
  findAllOrganizations() {
    return this.service.findAllOrganizations();
  }

  @Get('organization/:id')
  findOrganization(@Param('id') id: string) {
    return this.service.findOrganization(id);
  }

  @Post('organization')
  @Roles(Role.ADMIN)
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.service.createOrganization(dto);
  }

  @Put('organization/:id')
  @Roles(Role.ADMIN)
  updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.updateOrganization(id, dto);
  }

  @Delete('organization/:id')
  @Roles(Role.ADMIN)
  deleteOrganization(@Param('id') id: string) {
    return this.service.deleteOrganization(id);
  }

  // Library
  @Get('library')
  findAllLibraries(@Query('organizationId') organizationId?: string) {
    return this.service.findAllLibraries(organizationId);
  }

  @Get('library/:id')
  findLibrary(@Param('id') id: string) {
    return this.service.findLibrary(id);
  }

  @Post('library')
  @Roles(Role.ADMIN)
  createLibrary(@Body() dto: CreateLibraryDto) {
    return this.service.createLibrary(dto);
  }

  @Put('library/:id')
  @Roles(Role.ADMIN)
  updateLibrary(@Param('id') id: string, @Body() dto: UpdateLibraryDto) {
    return this.service.updateLibrary(id, dto);
  }

  @Delete('library/:id')
  @Roles(Role.ADMIN)
  deleteLibrary(@Param('id') id: string) {
    return this.service.deleteLibrary(id);
  }

  // Fields
  @Get('library/:id/fields')
  getLibraryFields(@Param('id') id: string) {
    return this.service.getLibraryFields(id);
  }

  @Post('library/:id/field')
  @Roles(Role.ADMIN)
  createField(@Param('id') id: string, @Body() dto: CreateFieldDto) {
    return this.service.createField(id, dto);
  }

  @Put('library/:id/field/:fieldId')
  @Roles(Role.ADMIN)
  updateField(@Param('id') id: string, @Param('fieldId') fieldId: string, @Body() dto: UpdateFieldDto) {
    return this.service.updateField(id, fieldId, dto);
  }

  @Delete('library/:id/field/:fieldId')
  @Roles(Role.ADMIN)
  deleteField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.service.deleteField(id, fieldId);
  }

  // Saved Values
  @Get('library/:id/value')
  getSavedValues(@Param('id') id: string) {
    return this.service.getSavedValues(id);
  }

  @Post('library/:id/value')
  saveValue(@Param('id') id: string, @Body() dto: SaveValueDto) {
    return this.service.saveValue(id, dto);
  }

  @Put('library/:id/value/:valueId')
  updateValue(@Param('id') id: string, @Param('valueId') valueId: string, @Body() dto: UpdateValueDto) {
    return this.service.updateValue(id, valueId, dto);
  }

  @Delete('library/:id/value/:valueId')
  deleteValue(@Param('id') id: string, @Param('valueId') valueId: string) {
    return this.service.deleteValue(id, valueId);
  }
}

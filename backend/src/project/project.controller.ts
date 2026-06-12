import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { IsString, IsEnum, IsOptional, IsInt, Min, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectService } from './project.service';
import { ProjectStatus, ProcurementType } from '@prisma/client';

class CreateProjectDto {
  @IsString() tenDuAn: string;
  @IsEnum(ProcurementType) procurementType: ProcurementType;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
}

class AddMemberDto {
  @IsString() userId: string;
}

class UpdateProjectDto {
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsString() tenDuAn?: string;
}

class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) limit?: number = 20;
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly svc: ProjectService) {}

  @Get('stats')
  async getStats() {
    return this.svc.getStats();
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query() pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    return this.svc.findAll(req.user.sub, req.user.role, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    return this.svc.getProjectSummary(id);
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string, @Query('stepKey') stepKey?: string) {
    return this.svc.getLogs(id, stepKey);
  }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.svc.create(dto.tenDuAn, dto.procurementType, req.user.sub, dto.memberIds);
  }

  // ── Project Members ──
  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.svc.getMembers(id);
  }

  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @Request() req: any) {
    return this.svc.addMember(id, dto.userId, req.user.sub);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    return this.svc.removeMember(id, userId, req.user.sub);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}

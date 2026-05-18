import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectService } from './project.service';
import { ProjectStatus, ProcurementType } from '@prisma/client';

class CreateProjectDto {
  @IsString() tenDuAn: string;
  @IsEnum(ProcurementType) procurementType: ProcurementType;
}

class UpdateProjectDto {
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsString() tenDuAn?: string;
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
  async findAll(@Request() req: any, @Query('type') type?: string) {
    return this.svc.findAll(req.user.sub, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    return this.svc.getProjectSummary(id);
  }

  @Post()
  async create(@Body() dto: CreateProjectDto, @Request() req: any) {
    return this.svc.create(dto.tenDuAn, dto.procurementType, req.user.sub);
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

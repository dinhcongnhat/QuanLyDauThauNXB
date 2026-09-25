import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApprovalRequestStatus,
  ApprovalTargetType,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApprovalGuard } from './approval.guard';
import { ApprovalsService } from './approvals.service';

class SubmitApprovalDto {
  @IsEnum(ApprovalTargetType)
  targetType: ApprovalTargetType;

  @IsString()
  targetId: string;

  @IsString()
  approverId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

class DecideApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

class RejectApprovalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment: string;
}

class ApprovalQueryDto {
  @IsOptional()
  @IsEnum(ApprovalRequestStatus)
  status?: ApprovalRequestStatus;

  @IsOptional()
  @IsEnum(ApprovalTargetType)
  targetType?: ApprovalTargetType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('approvers')
  getApprovers(
    @Request() req: any,
    @Query('q') q?: string,
  ) {
    return this.approvalsService.getApprovers(req.user.sub, q);
  }

  @Post('submit')
  submit(@Request() req: any, @Body() dto: SubmitApprovalDto) {
    return this.approvalsService.submit(req.user.sub, dto);
  }

  @Get('pending-count')
  @UseGuards(ApprovalGuard)
  async pendingCount(@Request() req: any) {
    return { count: await this.approvalsService.pendingCount(req.user.sub) };
  }

  @Get()
  @UseGuards(ApprovalGuard)
  list(@Request() req: any, @Query() query: ApprovalQueryDto) {
    return this.approvalsService.list(req.user.sub, query);
  }

  @Get(':id')
  @UseGuards(ApprovalGuard)
  getOne(@Request() req: any, @Param('id') id: string) {
    return this.approvalsService.getOne(id, req.user.sub);
  }

  @Post(':id/approve')
  @UseGuards(ApprovalGuard)
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.approvalsService.approve(id, req.user.sub, dto.comment);
  }

  @Post(':id/reject')
  @UseGuards(ApprovalGuard)
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectApprovalDto,
  ) {
    return this.approvalsService.reject(id, req.user.sub, dto.comment);
  }
}

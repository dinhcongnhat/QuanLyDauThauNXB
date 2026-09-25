import {
  ApprovalTargetType,
  DossierWorkflowType,
} from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateApprovalDossierDto {
  @IsEnum(DossierWorkflowType)
  workflowType: DossierWorkflowType;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(ApprovalTargetType)
  targetType?: ApprovalTargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

export class UpdateDossierItemDto {
  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class DossierTransitionDto {
  @IsString()
  approverId: string;

  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class DossierDecisionDto {
  @IsInt()
  @Min(1)
  expectedVersion: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class RejectDossierDto extends DossierDecisionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment: string;
}

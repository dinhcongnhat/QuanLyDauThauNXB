import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const Trim = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class CreateLegalDocumentDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  tenCanCu?: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  soHieu: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  coQuanBanHanh: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  hinhThucVanBan: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  linhVuc: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  trichYeuNoiDung: string;

  @IsDateString()
  ngayBanHanh: string;
}

export class UpdateLegalDocumentDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  tenCanCu?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  soHieu?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  coQuanBanHanh?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  hinhThucVanBan?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  linhVuc?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  trichYeuNoiDung?: string;

  @IsOptional()
  @IsDateString()
  ngayBanHanh?: string;
}

export class LegalDocumentQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  q?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  hinhThuc?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  linhVuc?: string;

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

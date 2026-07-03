import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export function assertXlsxFile(
  file: Express.Multer.File | undefined,
  description = '엑셀',
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException(`업로드할 ${description} 파일을 선택해 주세요.`);
  }

  const hasXlsxName = file.originalname.toLowerCase().endsWith('.xlsx');
  const hasXlsxMime = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
  ].includes(file.mimetype);

  if (!hasXlsxName || !hasXlsxMime) {
    throw new BadRequestException(`${description} 엑셀(.xlsx) 파일만 업로드할 수 있습니다.`);
  }
}

export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value) return cellToString(value.result as ExcelJS.CellValue);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink;
    return String(value);
  }
  return String(value);
}

export function normalizeExcelHeader(header: string): string {
  return header.replace(/[\s_()\[\]{}./-]/g, '').toLowerCase();
}

export function splitExcelList(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[\r\n,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

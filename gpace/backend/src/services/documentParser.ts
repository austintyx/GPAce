import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export const parseDocument = (filePath) => {
  const fileExtension = path.extname(filePath);

  if (fileExtension === '.csv') {
    return parseCsv(filePath);
  }

  throw new Error('Unsupported file type');
};

const parseCsv = (filePath) => {
  const fileContent = fs.readFileSync(filePath);
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  return records;
};
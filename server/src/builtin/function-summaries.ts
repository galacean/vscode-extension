import { readFileSync } from 'fs';
import * as path from 'path';
import { RES_DIR_PATH } from '../constants';

export interface IFunctionSummary {
  name: string;
  summary?: string;
  stage?: string;
  parameters: Array<IFunctionParameterSummary>;
  extension?: string;
  returnType: string;
}

export interface IFunctionParameterSummary {
  name: string;
  summary?: string;
  type: string;
}

export const functionSummaries: Record<string, IFunctionSummary> = JSON.parse(
  readFileSync(path.join(RES_DIR_PATH, 'functions.json')).toString()
);

import { readFileSync } from 'fs';
import * as path from 'path';
import { RES_DIR_PATH } from '../constants';

interface IEngineEnum {
  name: string;
  summary: string;
  properties: { name: string; summary?: string }[];
}

interface IGlslVariable {
  name: string;
  summary?: string;
  type?: string;
}

export const ENGINE_ENUMS: IEngineEnum[] = [
  {
    name: 'BlendOperation',
    summary:
      'Blend operation function.\n@remarks defines how a new pixel is combined with a pixel.',
    properties: [
      { name: 'Add', summary: 'src + dst.' },
      { name: 'Subtract', summary: 'src - dst.' },
      { name: 'ReverseSubtract', summary: 'dst - src.' },
      { name: 'Min', summary: 'Minimum of source and destination.' },
      { name: 'Max', summary: 'Maximum of source and destination.' },
    ],
  },
  {
    name: 'CompareFunction',
    summary:
      'Depth/Stencil comparison function.\n@remarks Specifies a function that compares incoming pixel depth/stencil to the current depth/stencil buffer value.',
    properties: [
      { name: 'Never', summary: 'never pass.' },
      {
        name: 'Less',
        summary:
          'pass if the incoming value is less than the depth/stencil buffer value.',
      },
      {
        name: 'Equal',
        summary:
          'pass if the incoming value equals the depth/stencil buffer value.',
      },
      { name: 'LessEqual' },
      { name: 'Greater' },
      { name: 'NotEqual' },
      { name: 'GreaterEqual' },
      { name: 'Always' },
    ],
  },
  {
    name: 'BlendFactor',
    summary:
      'Blend factor.\n@remarks defines which function is used for blending pixel arithmetic',
    properties: [
      { name: 'Zero', summary: '(0, 0, 0, 0)' },
      { name: 'One' },
      { name: 'SourceColor' },
      { name: 'OneMinusSourceColor' },
      { name: 'DestinationColor' },
      { name: 'OneMinusDestinationColor' },
      { name: 'SourceAlpha' },
      { name: 'OneMinusSourceAlpha' },
      { name: 'DestinationAlpha' },
      { name: 'OneMinusDestinationAlpha' },
      { name: 'SourceAlphaSaturate' },
      { name: 'BlendColor' },
      { name: 'OneMinusBlendColor' },
    ],
  },
  {
    name: 'StencilOperation',
    summary:
      'Stencil operation mode.\n@remarks sets the front and/or back-facing stencil test actions.',
    properties: [
      { name: 'Keep' },
      { name: 'Zero' },
      { name: 'Replace' },
      { name: 'IncrementSaturate' },
      { name: 'DecrementSaturate' },
      { name: 'Invert' },
      { name: 'IncrementWrap' },
      { name: 'DecrementWrap' },
    ],
  },
  {
    name: 'CullMode',
    summary:
      'Culling mode.\n@remarks specifies whether or not front- and/or back-facing polygons can be culled.',
    properties: [{ name: 'Off' }, { name: 'Front' }, { name: 'Back' }],
  },
];

export const GLSL_VARS: Record<string, IGlslVariable> = JSON.parse(
  readFileSync(path.join(RES_DIR_PATH, 'variables.json')).toString()
);

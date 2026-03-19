import type { Sample } from '../schema.ts';
import { extrusionBasicSample } from './extrusion.basic.ts';
import { extrusionLShapeSample } from './extrusion.lshape.ts';
import { booleanDifferenceSample } from './boolean.difference.ts';
import { revolvedBasicSample } from './revolved.basic.ts';

export const allSamples: Sample[] = [
  extrusionBasicSample,
  extrusionLShapeSample,
  booleanDifferenceSample,
  revolvedBasicSample,
];

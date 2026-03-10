import type { ExampleSample } from '../schema'
import { booleanDifferenceSample } from './boolean.difference'
import { extrusionBasicSample } from './extrusion.basic'

export const samples: ExampleSample[] = [extrusionBasicSample, booleanDifferenceSample]

export const sampleMap = new Map(samples.map((sample) => [sample.id, sample]))

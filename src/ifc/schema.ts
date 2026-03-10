export type ParameterType = 'number' | 'vector3' | 'boolean' | 'select'

export interface ParameterDefinition {
  key: string
  label: string
  type: ParameterType
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: string }>
}

export type Parameters = Record<string, number | boolean | string | [number, number, number]>

export interface PipelineStep {
  id: string
  title: string
  description: string
}

export interface ExampleEvaluation {
  steps: PipelineStep[]
  debugLines: string[]
}

export interface ExampleSample {
  id: string
  title: string
  category: 'extrusion' | 'boolean' | 'sweep' | 'revolved' | 'mappedItem'
  summary: string
  ifcTree: string[]
  pseudoIfc: string
  parameters: ParameterDefinition[]
  initialParams: Parameters
  evaluate: (params: Parameters) => ExampleEvaluation
}

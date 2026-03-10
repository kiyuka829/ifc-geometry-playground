export type GizmoKind = 'axis' | 'normal' | 'direction'

export interface GizmoConfig {
  kind: GizmoKind
  label: string
}

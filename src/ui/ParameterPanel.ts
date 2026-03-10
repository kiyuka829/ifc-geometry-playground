import type { ParameterDefinition, Parameters } from '../ifc/schema'

export function renderParameterPanel(
  container: HTMLElement,
  params: Parameters,
  definitions: ParameterDefinition[],
  onChange: (next: Parameters) => void,
): void {
  container.innerHTML = ''
  const title = document.createElement('h3')
  title.textContent = 'Parameters'
  container.append(title)

  definitions.forEach((def) => {
    const wrapper = document.createElement('label')
    wrapper.className = 'param-field'
    const caption = document.createElement('span')
    caption.textContent = def.label
    wrapper.append(caption)

    if (def.type === 'number') {
      const input = document.createElement('input')
      input.type = 'range'
      input.min = String(def.min ?? 0)
      input.max = String(def.max ?? 100)
      input.step = String(def.step ?? 1)
      input.value = String(params[def.key] ?? 0)
      const readout = document.createElement('strong')
      readout.textContent = String(input.value)
      input.oninput = () => {
        readout.textContent = input.value
        onChange({ ...params, [def.key]: Number(input.value) })
      }
      wrapper.append(input, readout)
    }

    if (def.type === 'vector3') {
      const values = (params[def.key] as [number, number, number]) ?? [0, 0, 1]
      const row = document.createElement('div')
      row.className = 'vector-row'
      ;['X', 'Y', 'Z'].forEach((axis, index) => {
        const input = document.createElement('input')
        input.type = 'number'
        input.step = '0.1'
        input.value = String(values[index])
        input.onchange = () => {
          const next = [...values] as [number, number, number]
          next[index] = Number(input.value)
          onChange({ ...params, [def.key]: next })
        }
        const item = document.createElement('label')
        item.textContent = axis
        item.append(input)
        row.append(item)
      })
      wrapper.append(row)
    }

    container.append(wrapper)
  })
}

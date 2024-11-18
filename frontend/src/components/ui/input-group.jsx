import { Group, InputElement } from '@chakra-ui/react'
import * as React from 'react'

export const InputGroup = React.forwardRef(function InputGroup(props, ref) {
  const {
    startElement,
    startElementProps,
    endElement,
    endElementProps,
    children,
    ...rest
  } = props

  return (
    <Group ref={ref} {...rest}>
      {startElement && (
        <InputElement pointerEvents='none' {...startElementProps}>
          {startElement}
        </InputElement>
      )}
      {React.cloneElement(children, {
        ...(startElement && { ps: 'calc(var(--input-height) - 6px)' }),
        ...(endElement && { pe: 'calc(var(--input-height) - 6px)' }),
        ...children.props,
      })}
      {endElement && (
        <InputElement placement='end' {...endElementProps}>
          {endElement}
        </InputElement>
      )}
    </Group>
  )
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { toApiError } from '../../api/errors.js'
import DropZone from './DropZone.jsx'

describe('DropZone API errors', () => {
  it('renders the message from the canonical error envelope', () => {
    const apiError = toApiError({
      response: {
        status: 422,
        data: {
          error: {
            code: 'INVALID_UPLOAD',
            message: 'Формат изображения не поддерживается',
            details: { accepted_types: ['image/jpeg', 'image/png'] },
          },
        },
      },
    })

    const file = new File(['invalid'], 'road.txt', { type: 'text/plain' })

    render(
      <DropZone
        file={file}
        onChange={vi.fn()}
        modelId="vision-v1"
        onModelChange={vi.fn()}
        onAnalyze={vi.fn()}
        onReportIssue={vi.fn()}
        prediction={null}
        error={apiError.message}
      />,
    )

    expect(screen.getByText('Формат изображения не поддерживается')).toBeTruthy()
  })
})

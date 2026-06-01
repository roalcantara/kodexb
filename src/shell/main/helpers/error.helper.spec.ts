import { afterEach, describe, expect, it, mock } from 'bun:test'

import { reportConfigLoadErrorAndExit } from './error.helper'

describe('reportConfigLoadErrorAndExit', () => {
  afterEach(() => {
    mock.restore()
  })

  it('shows error dialog then exits with code 1', async () => {
    const showMessageBox = mock(() => Promise.resolve({ response: 0 }))
    const exit = mock((_code?: number) => undefined as never)
    const logError = mock((_e: unknown) => undefined)

    await reportConfigLoadErrorAndExit(new Error('bad yaml'), {
      showMessageBox,
      exit,
      logError
    })

    expect(logError).toHaveBeenCalled()
    expect(showMessageBox).toHaveBeenCalledTimes(1)
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: expect.stringContaining('Configuration'),
        message: expect.stringContaining('bad yaml')
      })
    )
    expect(exit).toHaveBeenCalledWith(1)
  })
})

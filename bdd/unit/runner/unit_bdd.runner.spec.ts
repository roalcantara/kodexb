import { describe, expect, it } from 'bun:test'
import { unitBddCliArgs, unitTagExpression } from './unit_bdd.runner.ts'

describe('unit_bdd.runner', () => {
  it('unitTagExpression requires @unit and excludes @todo', () => {
    expect(unitTagExpression(['@sync_frecency_preserve'], '@ac:SF-1_AC1')).toBe(
      '@sync_frecency_preserve and @ac:SF-1_AC1 and @unit and not @todo'
    )
  })

  it('unitBddCliArgs invokes cucumber-js under bun', () => {
    expect(unitBddCliArgs({ catalogTags: ['@sync_frecency_preserve'], acTag: '@ac:SF-1_AC1' })).toEqual([
      '--bun',
      'node_modules/@cucumber/cucumber/bin/cucumber.js',
      '--import',
      'bdd/unit/support/register_steps.support.ts',
      '--tags',
      '@sync_frecency_preserve and @ac:SF-1_AC1 and @unit and not @todo',
      '--format',
      'progress',
      'assets/features/**/*.feature'
    ])
  })
})

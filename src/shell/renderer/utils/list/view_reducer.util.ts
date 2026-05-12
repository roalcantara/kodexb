export type ViewState = 'list' | 'split' | 'detail'
export type ViewAction = 'ADVANCE' | 'RETREAT' | 'CLOSE_TO_LIST'

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  if (action === 'ADVANCE') {
    return state === 'list' ? 'split' : state === 'split' ? 'detail' : state
  }
  if (action === 'RETREAT') {
    return state === 'detail' ? 'split' : state === 'split' ? 'list' : state
  }
  return 'list'
}

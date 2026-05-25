import { combineReducers, AnyAction, Reducer } from 'redux'
import auth, { AuthState } from './slices/auth'
import theme, { ThemeState } from './slices/theme/themeSlice'
import library from './slices/library/librarySlice'

export type RootState = {
  auth: AuthState
  theme: ThemeState
  library: ReturnType<typeof library>
}

export interface AsyncReducers {
  [key: string]: Reducer<any, AnyAction>
}

const staticReducers = {
  auth,
  theme,
  library,
}

const rootReducer =
  (asyncReducers?: AsyncReducers) => (state: RootState, action: AnyAction) => {
    const combinedReducer = combineReducers({
      ...staticReducers,
      ...asyncReducers,
    })
    return combinedReducer(state, action)
  }

export default rootReducer

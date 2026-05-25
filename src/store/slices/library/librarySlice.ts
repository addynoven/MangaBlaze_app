import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface LibraryManga {
  id: string
  title: string
  cover: string
  source: string
  status?: string
  lastReadChapter?: string
  lastReadChapterId?: string
  updatedAt?: string
}

interface LibraryState {
  pinnedSources: string[]
  bookmarks: LibraryManga[]
  history: LibraryManga[]
  unreadUpdates: string[]
  searchHistory: string[]
}

const initialState: LibraryState = {
  pinnedSources: ['mangadex', 'asurascans', 'comick'],
  bookmarks: [],
  history: [],
  unreadUpdates: [],
  searchHistory: [],
}

export const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setBookmarks: (state, action: PayloadAction<LibraryManga[]>) => {
      state.bookmarks = action.payload
    },
    setHistory: (state, action: PayloadAction<LibraryManga[]>) => {
      state.history = action.payload
    },
    toggleBookmarkLocal: (state, action: PayloadAction<LibraryManga>) => {
      const exists = state.bookmarks.find(m => m.id === action.payload.id && m.source === action.payload.source)
      if (exists) {
        state.bookmarks = state.bookmarks.filter(m => !(m.id === action.payload.id && m.source === action.payload.source))
      } else {
        state.bookmarks.unshift(action.payload)
      }
    },
    updateProgressLocal: (state, action: PayloadAction<LibraryManga>) => {
      // Update history
      const filtered = state.history.filter(m => !(m.id === action.payload.id && m.source === action.payload.source))
      state.history = [action.payload, ...filtered].slice(0, 50)

      // Update bookmark progress if it exists
      const bookmark = state.bookmarks.find(m => m.id === action.payload.id && m.source === action.payload.source)
      if (bookmark) {
        bookmark.lastReadChapter = action.payload.lastReadChapter
        bookmark.lastReadChapterId = action.payload.lastReadChapterId
        bookmark.updatedAt = action.payload.updatedAt
      }
    },
    addSearchToHistory: (state, action: PayloadAction<string>) => {
      const term = action.payload.trim()
      if (!term) return
      state.searchHistory = [term, ...state.searchHistory.filter(t => t !== term)].slice(0, 10)
    },
    clearSearchHistory: (state) => {
      state.searchHistory = []
    },
    setUnreadUpdates: (state, action: PayloadAction<string[]>) => {
      state.unreadUpdates = action.payload
    },
    clearUpdate: (state, action: PayloadAction<string>) => {
      state.unreadUpdates = state.unreadUpdates.filter(id => id !== action.payload)
    },
    togglePinSource: (state, action: PayloadAction<string>) => {
      const sourceId = action.payload
      if (state.pinnedSources.includes(sourceId)) {
        state.pinnedSources = state.pinnedSources.filter((id) => id !== sourceId)
      } else {
        state.pinnedSources.push(sourceId)
      }
    },
  },
})

export const { 
  togglePinSource, 
  setBookmarks,
  setHistory,
  toggleBookmarkLocal,
  updateProgressLocal,
  setUnreadUpdates, 
  clearUpdate,
  addSearchToHistory,
  clearSearchHistory
} = librarySlice.actions

export default librarySlice.reducer

package io.github.landwarderer.mangablaze.reader.ui

import io.github.landwarderer.mangablaze.reader.ui.pager.ReaderPage

data class ReaderContent(
	val pages: List<ReaderPage>,
	val state: ReaderState?
)
package io.github.landwarderer.mangablaze.history.ui

import android.content.Context
import io.github.landwarderer.mangablaze.core.ui.list.fastscroll.FastScroller
import io.github.landwarderer.mangablaze.list.ui.adapter.MangaListAdapter
import io.github.landwarderer.mangablaze.list.ui.adapter.MangaListListener
import io.github.landwarderer.mangablaze.list.ui.size.ItemSizeResolver

class HistoryListAdapter(
	listener: MangaListListener,
	sizeResolver: ItemSizeResolver,
) : MangaListAdapter(listener, sizeResolver), FastScroller.SectionIndexer {

	override fun getSectionText(context: Context, position: Int): CharSequence? {
		return findHeader(position)?.getText(context)
	}
}

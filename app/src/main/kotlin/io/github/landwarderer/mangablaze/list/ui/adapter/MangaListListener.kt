package io.github.landwarderer.mangablaze.list.ui.adapter

import android.view.View
import io.github.landwarderer.mangablaze.core.ui.widgets.TipView

interface MangaListListener : MangaDetailsClickListener, ListStateHolderListener, ListHeaderClickListener,
	TipView.OnButtonClickListener, QuickFilterClickListener {

	fun onFilterClick(view: View?)
}

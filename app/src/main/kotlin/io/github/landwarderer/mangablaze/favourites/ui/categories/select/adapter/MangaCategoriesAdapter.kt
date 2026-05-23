package io.github.landwarderer.mangablaze.favourites.ui.categories.select.adapter

import io.github.landwarderer.mangablaze.core.ui.BaseListAdapter
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener
import io.github.landwarderer.mangablaze.favourites.ui.categories.select.model.MangaCategoryItem
import io.github.landwarderer.mangablaze.list.ui.adapter.ListItemType
import io.github.landwarderer.mangablaze.list.ui.adapter.emptyStateListAD
import io.github.landwarderer.mangablaze.list.ui.adapter.loadingStateAD
import io.github.landwarderer.mangablaze.list.ui.model.ListModel

class MangaCategoriesAdapter(
	clickListener: OnListItemClickListener<MangaCategoryItem>,
) : BaseListAdapter<ListModel>() {

	init {
		addDelegate(ListItemType.NAV_ITEM, mangaCategoryAD(clickListener))
		addDelegate(ListItemType.STATE_LOADING, loadingStateAD())
		addDelegate(ListItemType.STATE_EMPTY, emptyStateListAD(null))
	}
}

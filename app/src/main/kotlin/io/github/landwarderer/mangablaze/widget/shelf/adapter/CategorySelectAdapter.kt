package io.github.landwarderer.mangablaze.widget.shelf.adapter

import io.github.landwarderer.mangablaze.core.ui.BaseListAdapter
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener
import io.github.landwarderer.mangablaze.widget.shelf.model.CategoryItem

class CategorySelectAdapter(
	clickListener: OnListItemClickListener<CategoryItem>
) : BaseListAdapter<CategoryItem>() {

	init {
		delegatesManager.addDelegate(categorySelectItemAD(clickListener))
	}
}

package io.github.landwarderer.mangablaze.filter.ui.tags

import android.content.Context
import com.hannesdorfmann.adapterdelegates4.dsl.adapterDelegateViewBinding
import io.github.landwarderer.mangablaze.core.ui.BaseListAdapter
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener
import io.github.landwarderer.mangablaze.core.ui.list.fastscroll.FastScroller
import io.github.landwarderer.mangablaze.core.util.ext.setChecked
import io.github.landwarderer.mangablaze.databinding.ItemCheckableNewBinding
import io.github.landwarderer.mangablaze.filter.ui.model.TagCatalogItem
import io.github.landwarderer.mangablaze.list.ui.ListModelDiffCallback
import io.github.landwarderer.mangablaze.list.ui.adapter.ListItemType
import io.github.landwarderer.mangablaze.list.ui.adapter.errorFooterAD
import io.github.landwarderer.mangablaze.list.ui.adapter.errorStateListAD
import io.github.landwarderer.mangablaze.list.ui.adapter.loadingFooterAD
import io.github.landwarderer.mangablaze.list.ui.adapter.loadingStateAD
import io.github.landwarderer.mangablaze.list.ui.model.ListModel

class TagsCatalogAdapter(
	listener: OnListItemClickListener<TagCatalogItem>,
) : BaseListAdapter<ListModel>(), FastScroller.SectionIndexer {

	init {
		addDelegate(ListItemType.FILTER_TAG, tagCatalogDelegate(listener))
		addDelegate(ListItemType.STATE_LOADING, loadingStateAD())
		addDelegate(ListItemType.FOOTER_LOADING, loadingFooterAD())
		addDelegate(ListItemType.FOOTER_ERROR, errorFooterAD(null))
		addDelegate(ListItemType.STATE_ERROR, errorStateListAD(null))
	}

	override fun getSectionText(context: Context, position: Int): CharSequence? {
		return (items.getOrNull(position) as? TagCatalogItem)?.tag?.title?.firstOrNull()?.uppercase()
	}

	private fun tagCatalogDelegate(
		listener: OnListItemClickListener<TagCatalogItem>,
	) = adapterDelegateViewBinding<TagCatalogItem, ListModel, ItemCheckableNewBinding>(
		{ layoutInflater, parent -> ItemCheckableNewBinding.inflate(layoutInflater, parent, false) },
	) {

		itemView.setOnClickListener {
			listener.onItemClick(item, itemView)
		}

		bind { payloads ->
			binding.root.text = item.tag.title
			binding.root.setChecked(item.isChecked, ListModelDiffCallback.PAYLOAD_CHECKED_CHANGED in payloads)
		}
	}
}

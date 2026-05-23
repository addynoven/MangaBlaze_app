package io.github.landwarderer.mangablaze.list.ui.adapter

import androidx.core.view.isVisible
import com.hannesdorfmann.adapterdelegates4.dsl.adapterDelegateViewBinding
import io.github.landwarderer.mangablaze.core.ui.list.AdapterDelegateClickListenerAdapter
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener
import io.github.landwarderer.mangablaze.core.util.ext.setTooltipCompat
import io.github.landwarderer.mangablaze.core.util.ext.textAndVisible
import io.github.landwarderer.mangablaze.databinding.ItemMangaListBinding
import io.github.landwarderer.mangablaze.list.ui.model.ListModel
import io.github.landwarderer.mangablaze.list.ui.model.MangaCompactListModel
import io.github.landwarderer.mangablaze.list.ui.model.MangaListModel

fun mangaListItemAD(
	clickListener: OnListItemClickListener<MangaListModel>,
) = adapterDelegateViewBinding<MangaCompactListModel, ListModel, ItemMangaListBinding>(
	{ inflater, parent -> ItemMangaListBinding.inflate(inflater, parent, false) },
) {

	AdapterDelegateClickListenerAdapter(this, clickListener).attach(itemView)

	bind {
		itemView.setTooltipCompat(item.getSummary(context))
		binding.textViewTitle.text = item.title
		binding.textViewSubtitle.textAndVisible = item.subtitle
		binding.imageViewCover.setImageAsync(item.coverUrl, item.manga)
		binding.badge.number = item.counter
		binding.badge.isVisible = item.counter > 0
	}
}

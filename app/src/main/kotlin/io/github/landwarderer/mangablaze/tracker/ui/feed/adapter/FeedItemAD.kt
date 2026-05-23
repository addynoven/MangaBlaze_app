package io.github.landwarderer.mangablaze.tracker.ui.feed.adapter

import androidx.core.content.ContextCompat
import com.hannesdorfmann.adapterdelegates4.dsl.adapterDelegateViewBinding
import io.github.landwarderer.mangablaze.R
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener
import io.github.landwarderer.mangablaze.core.util.ext.drawableStart
import io.github.landwarderer.mangablaze.core.util.ext.getQuantityStringSafe
import io.github.landwarderer.mangablaze.databinding.ItemFeedBinding
import io.github.landwarderer.mangablaze.list.ui.model.ListModel
import io.github.landwarderer.mangablaze.tracker.ui.feed.model.FeedItem

fun feedItemAD(
	clickListener: OnListItemClickListener<FeedItem>,
) = adapterDelegateViewBinding<FeedItem, ListModel, ItemFeedBinding>(
	{ inflater, parent -> ItemFeedBinding.inflate(inflater, parent, false) },
) {
	val indicatorNew = ContextCompat.getDrawable(context, R.drawable.ic_new)

	itemView.setOnClickListener {
		clickListener.onItemClick(item, it)
	}

	bind {
		binding.imageViewCover.setImageAsync(item.imageUrl, item.manga.source)
		binding.textViewTitle.text = item.title
		binding.textViewSummary.text = context.resources.getQuantityStringSafe(
			R.plurals.new_chapters,
			item.count,
			item.count,
		)
		binding.textViewSummary.drawableStart = if (item.isNew) {
			indicatorNew
		} else {
			null
		}
	}
}

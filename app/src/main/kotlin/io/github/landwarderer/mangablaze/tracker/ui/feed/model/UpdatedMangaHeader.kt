package io.github.landwarderer.mangablaze.tracker.ui.feed.model

import io.github.landwarderer.mangablaze.list.ui.ListModelDiffCallback
import io.github.landwarderer.mangablaze.list.ui.model.ListModel
import io.github.landwarderer.mangablaze.list.ui.model.MangaListModel

data class UpdatedMangaHeader(
	val list: List<MangaListModel>,
) : ListModel {

	override fun areItemsTheSame(other: ListModel): Boolean {
		return other is UpdatedMangaHeader
	}

	override fun getChangePayload(previousState: ListModel): Any {
		return ListModelDiffCallback.PAYLOAD_NESTED_LIST_CHANGED
	}
}

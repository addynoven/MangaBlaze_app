package io.github.landwarderer.mangablaze.explore.ui.model

import io.github.landwarderer.mangablaze.list.ui.model.ListModel
import io.github.landwarderer.mangablaze.list.ui.model.MangaCompactListModel

data class RecommendationsItem(
	val manga: List<MangaCompactListModel>
) : ListModel {

	override fun areItemsTheSame(other: ListModel): Boolean {
		return other is RecommendationsItem
	}
}

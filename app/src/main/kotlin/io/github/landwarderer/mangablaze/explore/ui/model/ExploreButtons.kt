package io.github.landwarderer.mangablaze.explore.ui.model

import io.github.landwarderer.mangablaze.list.ui.model.ListModel

data class ExploreButtons(
	val isRandomLoading: Boolean,
) : ListModel {

	override fun areItemsTheSame(other: ListModel): Boolean {
		return other is ExploreButtons
	}
}

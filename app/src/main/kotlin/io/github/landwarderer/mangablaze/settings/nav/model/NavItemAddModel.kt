package io.github.landwarderer.mangablaze.settings.nav.model

import io.github.landwarderer.mangablaze.list.ui.model.ListModel

data class NavItemAddModel(
	val canAdd: Boolean,
) : ListModel {

	override fun areItemsTheSame(other: ListModel): Boolean = other is NavItemAddModel
}

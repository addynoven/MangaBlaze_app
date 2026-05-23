package io.github.landwarderer.mangablaze.settings.nav.model

import androidx.annotation.StringRes
import io.github.landwarderer.mangablaze.core.prefs.NavItem
import io.github.landwarderer.mangablaze.list.ui.model.ListModel

data class NavItemConfigModel(
	val item: NavItem,
	@StringRes val disabledHintResId: Int,
) : ListModel {

	override fun areItemsTheSame(other: ListModel): Boolean {
		return other is NavItemConfigModel && other.item == item
	}
}

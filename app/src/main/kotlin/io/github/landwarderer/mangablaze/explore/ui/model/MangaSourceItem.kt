package io.github.landwarderer.mangablaze.explore.ui.model

import io.github.landwarderer.mangablaze.core.model.MangaSourceInfo
import io.github.landwarderer.mangablaze.list.ui.model.ListModel
import org.koitharu.kotatsu.parsers.util.longHashCode

data class MangaSourceItem(
	val source: MangaSourceInfo,
	val isGrid: Boolean,
) : ListModel {

	val id: Long = source.name.longHashCode()

	override fun areItemsTheSame(other: ListModel): Boolean {
		return other is MangaSourceItem && other.source == source
	}
}

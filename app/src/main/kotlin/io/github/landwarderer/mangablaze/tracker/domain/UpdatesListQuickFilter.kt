package io.github.landwarderer.mangablaze.tracker.domain

import io.github.landwarderer.mangablaze.core.prefs.AppSettings
import io.github.landwarderer.mangablaze.favourites.domain.FavouritesRepository
import io.github.landwarderer.mangablaze.list.domain.ListFilterOption
import io.github.landwarderer.mangablaze.list.domain.MangaListQuickFilter
import javax.inject.Inject

class UpdatesListQuickFilter @Inject constructor(
	private val favouritesRepository: FavouritesRepository,
	settings: AppSettings,
) : MangaListQuickFilter(settings) {

	override suspend fun getAvailableFilterOptions(): List<ListFilterOption> =
		favouritesRepository.getMostUpdatedCategories(
			limit = 4,
		).map {
			ListFilterOption.Favorite(it)
		}
}

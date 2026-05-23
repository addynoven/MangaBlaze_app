package io.github.landwarderer.mangablaze.scrobbling.common.domain

import io.github.landwarderer.mangablaze.scrobbling.anilist.data.AniListRepository
import io.github.landwarderer.mangablaze.scrobbling.common.data.ScrobblerRepository
import io.github.landwarderer.mangablaze.scrobbling.common.domain.model.ScrobblerService
import io.github.landwarderer.mangablaze.scrobbling.kitsu.data.KitsuRepository
import io.github.landwarderer.mangablaze.scrobbling.mal.data.MALRepository
import io.github.landwarderer.mangablaze.scrobbling.shikimori.data.ShikimoriRepository
import javax.inject.Inject
import javax.inject.Provider

class ScrobblerRepositoryMap @Inject constructor(
	private val shikimoriRepository: Provider<ShikimoriRepository>,
	private val aniListRepository: Provider<AniListRepository>,
	private val malRepository: Provider<MALRepository>,
	private val kitsuRepository: Provider<KitsuRepository>,
) {

	operator fun get(scrobblerService: ScrobblerService): ScrobblerRepository = when (scrobblerService) {
		ScrobblerService.SHIKIMORI -> shikimoriRepository
		ScrobblerService.ANILIST -> aniListRepository
		ScrobblerService.MAL -> malRepository
		ScrobblerService.KITSU -> kitsuRepository
	}.get()
}

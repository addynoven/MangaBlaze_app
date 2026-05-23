package io.github.landwarderer.mangablaze.favourites.domain.model

import io.github.landwarderer.mangablaze.core.model.MangaSource

data class Cover(
	val url: String?,
	val source: String,
) {
	val mangaSource by lazy { MangaSource(source) }
}

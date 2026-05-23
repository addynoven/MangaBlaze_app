package io.github.landwarderer.mangablaze.history.domain.model

import io.github.landwarderer.mangablaze.core.model.MangaHistory
import org.koitharu.kotatsu.parsers.model.Manga

data class MangaWithHistory(
	val manga: Manga,
	val history: MangaHistory
)

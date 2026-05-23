package io.github.landwarderer.mangablaze.favourites.data

import io.github.landwarderer.mangablaze.core.db.entity.toManga
import io.github.landwarderer.mangablaze.core.db.entity.toMangaTags
import io.github.landwarderer.mangablaze.core.model.FavouriteCategory
import io.github.landwarderer.mangablaze.list.domain.ListSortOrder
import java.time.Instant

fun FavouriteCategoryEntity.toFavouriteCategory(id: Long = categoryId.toLong()) = FavouriteCategory(
	id = id,
	title = title,
	sortKey = sortKey,
	order = ListSortOrder(order, ListSortOrder.NEWEST),
	createdAt = Instant.ofEpochMilli(createdAt),
	isTrackingEnabled = track,
	isVisibleInLibrary = isVisibleInLibrary,
)

fun FavouriteManga.toManga() = manga.toManga(tags.toMangaTags(), null)

fun Collection<FavouriteManga>.toMangaList() = map { it.toManga() }

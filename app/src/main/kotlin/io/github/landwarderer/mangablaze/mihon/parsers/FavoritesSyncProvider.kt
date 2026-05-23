package io.github.landwarderer.mangablaze.mihon.parsers

import io.github.landwarderer.mangablaze.mihon.parsers.model.Content

interface FavoritesSyncProvider {

    suspend fun addFavorite(manga: Content): Boolean

    suspend fun removeFavorite(manga: Content): Boolean
}

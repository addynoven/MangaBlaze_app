package io.github.landwarderer.mangablaze.mihon.parsers

import io.github.landwarderer.mangablaze.mihon.parsers.model.Content

interface FavoritesProvider {

    suspend fun fetchFavorites(): List<Content>
}

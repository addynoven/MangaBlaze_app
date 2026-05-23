package io.github.landwarderer.mangablaze.mihon.model

import io.github.landwarderer.mangablaze.mihon.parsers.model.ContentSource

data class ContentSourceInfo(
    val mangaSource: ContentSource,
    val isEnabled: Boolean,
    val isPinned: Boolean,
) : ContentSource by mangaSource

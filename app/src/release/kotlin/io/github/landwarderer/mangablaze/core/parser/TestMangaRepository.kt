package io.github.landwarderer.mangablaze.core.parser

import io.github.landwarderer.mangablaze.core.cache.MemoryContentCache
import io.github.landwarderer.mangablaze.core.model.TestMangaSource
import org.koitharu.kotatsu.parsers.MangaLoaderContext

@Suppress("unused")
class TestMangaRepository(
	private val loaderContext: MangaLoaderContext,
	cache: MemoryContentCache
) : EmptyMangaRepository(TestMangaSource)

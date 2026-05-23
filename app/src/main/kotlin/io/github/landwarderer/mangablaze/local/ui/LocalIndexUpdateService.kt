package io.github.landwarderer.mangablaze.local.ui

import android.content.Intent
import dagger.hilt.android.AndroidEntryPoint
import io.github.landwarderer.mangablaze.core.ui.CoroutineIntentService
import io.github.landwarderer.mangablaze.local.data.index.LocalMangaIndex
import javax.inject.Inject

@AndroidEntryPoint
class LocalIndexUpdateService : CoroutineIntentService() {

	@Inject
	lateinit var localMangaIndex: LocalMangaIndex

	override suspend fun IntentJobContext.processIntent(intent: Intent) {
		localMangaIndex.update()
	}

	override fun IntentJobContext.onError(error: Throwable) = Unit
}

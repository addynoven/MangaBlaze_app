package io.github.landwarderer.mangablaze.reader.ui.colorfilter

import androidx.lifecycle.SavedStateHandle
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import io.github.landwarderer.mangablaze.core.model.parcelable.ParcelableManga
import io.github.landwarderer.mangablaze.core.model.parcelable.ParcelableMangaPage
import io.github.landwarderer.mangablaze.core.nav.AppRouter
import io.github.landwarderer.mangablaze.core.parser.MangaDataRepository
import io.github.landwarderer.mangablaze.core.prefs.AppSettings
import io.github.landwarderer.mangablaze.core.ui.BaseViewModel
import io.github.landwarderer.mangablaze.core.util.ext.MutableEventFlow
import io.github.landwarderer.mangablaze.core.util.ext.call
import io.github.landwarderer.mangablaze.core.util.ext.require
import io.github.landwarderer.mangablaze.reader.domain.ReaderColorFilter
import javax.inject.Inject

@HiltViewModel
class ColorFilterConfigViewModel @Inject constructor(
	savedStateHandle: SavedStateHandle,
	private val settings: AppSettings,
	private val mangaDataRepository: MangaDataRepository,
) : BaseViewModel() {

	private val manga = savedStateHandle.require<ParcelableManga>(AppRouter.KEY_MANGA).manga

	private var initialColorFilter: ReaderColorFilter? = null
	val colorFilter = MutableStateFlow<ReaderColorFilter?>(null)
	val onDismiss = MutableEventFlow<Unit>()
	val preview = savedStateHandle.require<ParcelableMangaPage>(AppRouter.KEY_PAGES).page

	val isChanged: Boolean
		get() = colorFilter.value != initialColorFilter

	init {
		launchLoadingJob {
			initialColorFilter = mangaDataRepository.getColorFilter(manga.id) ?: settings.readerColorFilter
			colorFilter.value = initialColorFilter
		}
	}

	fun setBrightness(brightness: Float) {
		updateColorFilter { it.copy(brightness = brightness) }
	}

	fun setContrast(contrast: Float) {
		updateColorFilter { it.copy(contrast = contrast) }
	}

	fun setInversion(invert: Boolean) {
		updateColorFilter { it.copy(isInverted = invert) }
	}

	fun setGrayscale(grayscale: Boolean) {
		updateColorFilter { it.copy(isGrayscale = grayscale) }
	}

	fun setBookEffect(book: Boolean) {
		updateColorFilter { it.copy(isBookBackground = book) }
	}

	fun reset() {
		colorFilter.value = null
	}

	fun save() {
		launchLoadingJob(Dispatchers.IO) {
			mangaDataRepository.saveColorFilter(manga, colorFilter.value)
			onDismiss.call(Unit)
		}
	}

	fun saveGlobally() {
		launchLoadingJob(Dispatchers.IO) {
			settings.readerColorFilter = colorFilter.value
			mangaDataRepository.resetColorFilters()
			onDismiss.call(Unit)
		}
	}

	private inline fun updateColorFilter(block: (ReaderColorFilter) -> ReaderColorFilter) {
		colorFilter.value = block(
			colorFilter.value ?: ReaderColorFilter.EMPTY,
		).takeUnless { it.isEmpty }
	}
}

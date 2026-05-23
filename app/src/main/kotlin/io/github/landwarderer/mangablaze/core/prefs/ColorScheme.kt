package io.github.landwarderer.mangablaze.core.prefs

import androidx.annotation.Keep
import androidx.annotation.StringRes
import androidx.annotation.StyleRes
import com.google.android.material.color.DynamicColors
import io.github.landwarderer.mangablaze.R
import org.koitharu.kotatsu.parsers.util.find

@Keep
enum class ColorScheme(
	@StyleRes val styleResId: Int,
	@StringRes val titleResId: Int,
) {

	DEFAULT(R.style.ThemeOverlay_MangaBlaze_Totoro, R.string.theme_name_totoro),
	MONET(R.style.ThemeOverlay_MangaBlaze_Monet, R.string.theme_name_dynamic),
	EXPRESSIVE(R.style.ThemeOverlay_MangaBlaze_Expressive, R.string.theme_name_expressive),
	MIKU(R.style.ThemeOverlay_MangaBlaze_Miku, R.string.theme_name_miku),
	RENA(R.style.ThemeOverlay_MangaBlaze_Asuka, R.string.theme_name_asuka),
	FROG(R.style.ThemeOverlay_MangaBlaze_Mion, R.string.theme_name_mion),
	BLUEBERRY(R.style.ThemeOverlay_MangaBlaze_Rikka, R.string.theme_name_rikka),
	SAKURA(R.style.ThemeOverlay_MangaBlaze_Sakura, R.string.theme_name_sakura),
	MAMIMI(R.style.ThemeOverlay_MangaBlaze_Mamimi, R.string.theme_name_mamimi),
	KANADE(R.style.ThemeOverlay_MangaBlaze_Kanade, R.string.theme_name_kanade),
	ITSUKA(R.style.ThemeOverlay_MangaBlaze_Itsuka, R.string.theme_name_itsuka),
	;

	companion object {

		val default: ColorScheme
			get() = if (DynamicColors.isDynamicColorAvailable()) {
				MONET
			} else {
				DEFAULT
			}

		fun getAvailableList(): List<ColorScheme> {
			val list = ColorScheme.entries.toMutableList()
			if (!DynamicColors.isDynamicColorAvailable()) {
				list.remove(MONET)
				list.remove(EXPRESSIVE)
			}
			return list
		}

		fun safeValueOf(name: String): ColorScheme? {
			return ColorScheme.entries.find(name)
		}
	}
}

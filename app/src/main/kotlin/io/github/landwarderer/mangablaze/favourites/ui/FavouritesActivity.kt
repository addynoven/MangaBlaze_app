package io.github.landwarderer.mangablaze.favourites.ui

import android.os.Bundle
import io.github.landwarderer.mangablaze.core.nav.AppRouter
import io.github.landwarderer.mangablaze.core.ui.FragmentContainerActivity
import io.github.landwarderer.mangablaze.favourites.ui.list.FavouritesListFragment

class FavouritesActivity : FragmentContainerActivity(FavouritesListFragment::class.java) {

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		val categoryTitle = intent.getStringExtra(AppRouter.KEY_TITLE)
		if (categoryTitle != null) {
			title = categoryTitle
		}
	}
}

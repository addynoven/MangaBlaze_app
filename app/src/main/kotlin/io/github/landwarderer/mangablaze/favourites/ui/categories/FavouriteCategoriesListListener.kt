package io.github.landwarderer.mangablaze.favourites.ui.categories

import android.view.View
import androidx.recyclerview.widget.RecyclerView
import io.github.landwarderer.mangablaze.core.model.FavouriteCategory
import io.github.landwarderer.mangablaze.core.ui.list.OnListItemClickListener

interface FavouriteCategoriesListListener : OnListItemClickListener<FavouriteCategory?> {

	fun onDragHandleTouch(holder: RecyclerView.ViewHolder): Boolean

	fun onEditClick(item: FavouriteCategory, view: View)

	fun onShowAllClick(isChecked: Boolean)
}

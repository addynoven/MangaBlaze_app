package io.github.landwarderer.mangablaze.details.ui.scrobbling

import io.github.landwarderer.mangablaze.core.nav.AppRouter
import io.github.landwarderer.mangablaze.core.ui.BaseListAdapter
import io.github.landwarderer.mangablaze.list.ui.model.ListModel

class ScrollingInfoAdapter(
	router: AppRouter,
) : BaseListAdapter<ListModel>() {

	init {
		delegatesManager.addDelegate(scrobblingInfoAD(router))
	}
}

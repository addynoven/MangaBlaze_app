package io.github.landwarderer.mangablaze.settings.sources.adapter

import io.github.landwarderer.mangablaze.core.ui.ReorderableListAdapter
import io.github.landwarderer.mangablaze.settings.sources.model.SourceConfigItem

class SourceConfigAdapter(
	listener: SourceConfigListener,
) : ReorderableListAdapter<SourceConfigItem>() {

	init {
		with(delegatesManager) {
			addDelegate(sourceConfigItemDelegate2(listener))
			addDelegate(sourceConfigEmptySearchDelegate())
			addDelegate(sourceConfigTipDelegate(listener))
		}
	}
}

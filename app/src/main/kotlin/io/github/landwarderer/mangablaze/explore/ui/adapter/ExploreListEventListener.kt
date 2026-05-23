package io.github.landwarderer.mangablaze.explore.ui.adapter

import android.view.View
import io.github.landwarderer.mangablaze.list.ui.adapter.ListHeaderClickListener
import io.github.landwarderer.mangablaze.list.ui.adapter.ListStateHolderListener

interface ExploreListEventListener : ListStateHolderListener, View.OnClickListener, ListHeaderClickListener

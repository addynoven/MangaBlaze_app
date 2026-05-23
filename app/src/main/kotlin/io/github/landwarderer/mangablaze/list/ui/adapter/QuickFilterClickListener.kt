package io.github.landwarderer.mangablaze.list.ui.adapter

import io.github.landwarderer.mangablaze.list.domain.ListFilterOption

interface QuickFilterClickListener {

	fun onFilterOptionClick(option: ListFilterOption)
}

package io.github.landwarderer.mangablaze.list.domain

interface QuickFilterListener {

	fun setFilterOption(option: ListFilterOption, isApplied: Boolean)

	fun toggleFilterOption(option: ListFilterOption)

	fun clearFilter()
}

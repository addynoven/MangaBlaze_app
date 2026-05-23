package io.github.landwarderer.mangablaze.core.exceptions

class SyncApiException(
	message: String,
	val code: Int,
) : RuntimeException(message)

package io.github.landwarderer.mangablaze.scrobbling.common.domain

import okio.IOException
import io.github.landwarderer.mangablaze.scrobbling.common.domain.model.ScrobblerService

class ScrobblerAuthRequiredException(
	val scrobbler: ScrobblerService,
) : IOException()

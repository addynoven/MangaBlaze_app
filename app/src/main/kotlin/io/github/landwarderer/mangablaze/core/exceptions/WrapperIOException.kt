package io.github.landwarderer.mangablaze.core.exceptions

import okio.IOException

class WrapperIOException(override val cause: Exception) : IOException(cause)

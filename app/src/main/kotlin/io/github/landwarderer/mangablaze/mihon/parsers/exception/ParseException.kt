package io.github.landwarderer.mangablaze.mihon.parsers.exception

import io.github.landwarderer.mangablaze.mihon.parsers.InternalParsersApi

public class ParseException @InternalParsersApi @JvmOverloads constructor(
	public val shortMessage: String?,
	public val url: String,
	cause: Throwable? = null,
) : RuntimeException("$shortMessage at $url", cause)


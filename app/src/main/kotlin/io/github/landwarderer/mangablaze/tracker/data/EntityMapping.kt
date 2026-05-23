package io.github.landwarderer.mangablaze.tracker.data

import io.github.landwarderer.mangablaze.core.db.entity.toManga
import io.github.landwarderer.mangablaze.core.db.entity.toMangaTags
import io.github.landwarderer.mangablaze.tracker.domain.model.TrackingLogItem
import java.time.Instant

fun TrackLogWithManga.toTrackingLogItem(): TrackingLogItem {
	val chaptersList = trackLog.chapters.split('\n').filterNot { x -> x.isEmpty() }
	return TrackingLogItem(
		id = trackLog.id,
		chapters = chaptersList,
		manga = manga.toManga(tags.toMangaTags(), null),
		createdAt = Instant.ofEpochMilli(trackLog.createdAt),
		isNew = trackLog.isUnread,
	)
}

import type {
  MangaSource,
  SourceManga,
  SourceMangaDetail,
  SourceChapter,
  SourcePage,
} from './types'

const BASE_URL = 'https://kemono.cr'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/* ── Kemono API helpers ─────────────────────────────────────────────── */

// Kemono requires the Accept: text/css header to serve JSON from its API.
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/css',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Kemono API error: ${res.status} ${url}`)
  return res.json()
}

function getImageUrl(path: string): string {
  return `${BASE_URL}/data${path}`
}

function isImage(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
}

/* ── ID encoding ────────────────────────────────────────────────────── */

function makeMangaId(service: string, userId: string): string {
  return `${service}:${userId}`
}

function makeChapterId(service: string, userId: string, postId: string): string {
  return `${service}:${userId}:${postId}`
}

function parseMangaId(mangaId: string): { service: string; userId: string } {
  const parts = mangaId.split(':')
  return { service: parts[0], userId: parts[1] }
}

function parseChapterId(
  chapterId: string
): { service: string; userId: string; postId: string } {
  const parts = chapterId.split(':')
  return { service: parts[0], userId: parts[1], postId: parts[2] }
}

/* ── Types ──────────────────────────────────────────────────────────── */

interface KemonoPost {
  id: string
  user: string
  service: string
  title: string
  published: string
  file: { name?: string; path?: string }
  attachments: Array<{ name: string; path: string }>
}

interface KemonoProfile {
  id: string
  name: string
  service: string
  public_id: string
  post_count: number
}

/* ── Source implementation ──────────────────────────────────────────── */

export const kemonoSource: MangaSource = {
  id: 'kemono',
  name: 'Kemono',
  type: 'api',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const data = await fetchJSON<{ posts: KemonoPost[] }>(
        `${BASE_URL}/api/v1/posts?q=${encodeURIComponent(query)}&o=0`
      )

      // Group posts by creator so each creator becomes one "manga" entry.
      const creators = new Map<string, KemonoPost>()
      for (const post of data.posts || []) {
        const key = makeMangaId(post.service, post.user)
        if (!creators.has(key)) creators.set(key, post)
      }

      const results: SourceManga[] = []
      for (const [key, post] of creators) {
        const { service, userId } = parseMangaId(key)

        let title = post.title
        try {
          const profile = await fetchJSON<KemonoProfile>(
            `${BASE_URL}/api/v1/${service}/user/${userId}/profile`
          )
          if (profile.name) title = profile.name
        } catch {
          // ignore profile fetch failure
        }

        let cover = '/images/placeholder.png'
        if (post.file?.path && isImage(post.file.name || '')) {
          cover = getImageUrl(post.file.path)
        } else if (post.attachments?.[0]?.path) {
          cover = getImageUrl(post.attachments[0].path)
        }

        results.push({ id: key, title, cover })
        if (results.length >= limit) break
      }

      return results
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const { service, userId } = parseMangaId(mangaId)
      const profile = await fetchJSON<KemonoProfile>(
        `${BASE_URL}/api/v1/${service}/user/${userId}/profile`
      )

      // Use the latest post as cover art.
      let cover = '/images/placeholder.png'
      try {
        const posts = await fetchJSON<KemonoPost[]>(
          `${BASE_URL}/api/v1/${service}/user/${userId}/posts?o=0`
        )
        const latest = posts?.[0]
        if (latest?.file?.path && isImage(latest.file.name || '')) {
          cover = getImageUrl(latest.file.path)
        } else if (latest?.attachments?.[0]?.path) {
          cover = getImageUrl(latest.attachments[0].path)
        }
      } catch {
        // ignore
      }

      const name = profile.name || profile.public_id || mangaId

      return {
        id: mangaId,
        title: name,
        cover,
        description: '',
        authors: [name],
        artists: [],
        genres: [],
        altTitles: [],
        status: 'unknown',
        year: null,
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(
    mangaId: string,
    limit = 100,
    offset = 0
  ): Promise<SourceChapter[]> {
    try {
      const { service, userId } = parseMangaId(mangaId)
      const posts = await fetchJSON<KemonoPost[]>(
        `${BASE_URL}/api/v1/${service}/user/${userId}/posts?o=${offset}`
      )

      return (posts || []).slice(0, limit).map((post, idx) => {
        const imageCount =
          (post.file?.path && isImage(post.file.name || '') ? 1 : 0) +
          post.attachments.filter((a) => isImage(a.name)).length

        return {
          id: makeChapterId(service, userId, post.id),
          chapterNumber: String(offset + idx + 1),
          title: post.title || null,
          volume: null,
          language: 'en',
          pages: imageCount,
          publishedAt: post.published,
          readableAt: post.published,
          externalUrl: null,
          isUnavailable: false,
        }
      })
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const { service, userId, postId } = parseChapterId(chapterId)
      const detail = await fetchJSON<{
        post: KemonoPost & {
          file: { name?: string; path?: string }
          attachments: Array<{ name: string; path: string }>
        }
      }>(`${BASE_URL}/api/v1/${service}/user/${userId}/post/${postId}`)

      const urls: string[] = []
      if (detail.post.file?.path && isImage(detail.post.file.name || '')) {
        urls.push(getImageUrl(detail.post.file.path))
      }
      for (const att of detail.post.attachments || []) {
        if (isImage(att.name)) urls.push(getImageUrl(att.path))
      }

      return urls.map((url, index) => ({ url, index }))
    } catch {
      return []
    }
  },
}

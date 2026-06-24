/**
 * Photo data layer.
 *
 * Generates deterministic photo entries from inline captions.
 * Images are expected under public/pic/ as 001.jpg, 002.jpg, …
 *
 * This is the single source of truth for all photo data.
 * UI components must never generate or mutate caption data.
 */

import type { Photo } from '../types/photo.ts'
import { getPhotoScatter } from '../utils/scatter.ts'

/**
 * Hand-crafted artistic captions — Chinese with emoji.
 *
 * Each caption is unique — warm, emotional, cinematic, and occasionally humorous.
 * No placeholder text, no repetitive patterns.
 */
const CAPTIONS: readonly string[] = [
  '有些美好，连记忆都装不下 🌅',
  '不是每一场日落都需要观众 🌇',
  '这张照片不小心就成了我的最爱 📸',
  '最好的故事，都藏在照片的缝隙里 ✨',
  '光总是能找到最重要的东西 💫',
  '每一道影子，都在说一段光忘记的故事 🌒',
  '在某个不远不近的地方，我们遇见了这片风景 🏔️',
  '天空那天说的话，文字根本翻译不了 ☁️',
  '原来安静可以这么响亮 🌙',
  '跟时间借来的一瞬间，没打算还 ⌛',
  '差点错过的东西，相机替我们记住了 👀',
  '金色时刻亲吻了它路过的每一寸 🌤️',
  '有些地方，离开了却从来没离开过 🏡',
  '当世界忘记普通的时候，就会变成这样 🌌',
  '调色盘里找不到的颜色，这里都有 🎨',
  '按下快门的时候，时间停了一秒 ⏸️',
]

function getPhotoSrc(id: number): string {
  const padded = String(id).padStart(3, '0')
  return `/pic/${padded}.jpg`
}

/**
 * Returns the full deterministic photo array.
 *
 * Pure function — same call always produces the same result.
 */
export function getAllPhotos(): readonly Photo[] {
  const photos: Photo[] = []

  for (let i = 0; i < CAPTIONS.length; i++) {
    const id = i + 1
    const scatter = getPhotoScatter(id)

    photos.push({
      id,
      src: getPhotoSrc(id),
      caption: CAPTIONS[i],
      rotation: scatter.rotation,
      offsetX: scatter.offsetX,
      offsetY: scatter.offsetY,
    })
  }

  return photos
}

/**
 * Returns a single photo by its ID, or undefined if not found.
 */
export function getPhotoById(id: number): Photo | undefined {
  return getAllPhotos().find(photo => photo.id === id)
}

/**
 * Returns the total number of photos.
 */
export function getTotalPhotoCount(): number {
  return CAPTIONS.length
}

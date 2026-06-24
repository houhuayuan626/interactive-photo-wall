/**
 * App — root component.
 *
 * Wraps photo gallery + lightbox in a cinematic layout with:
 *  - Animated background (aurora gradients, blur circles, breathing)
 *  - Floating ambient particles
 *  - Photo grid with lightbox preview
 *
 * Kept intentionally small per architectural guidelines.
 */

import { useCallback } from 'react'
import { getAllPhotos, getTotalPhotoCount } from './data/photos.ts'
import { PhotoGrid } from './components/PhotoGrid/PhotoGrid.tsx'
import { Lightbox } from './components/Lightbox/Lightbox.tsx'
import { useLightbox } from './hooks/useLightbox.ts'
import Background from './components/Background/Background.tsx'
import FloatingParticles from './components/FloatingParticles/FloatingParticles.tsx'
import './App.css'

const photos = getAllPhotos()
const totalCount = getTotalPhotoCount()

function App() {
  const {
    open,
    selectedIndex,
    openLightbox,
    closeLightbox,
    nextPhoto,
    previousPhoto,
  } = useLightbox()

  const handlePhotoClick = useCallback(
    (id: number) => {
      // Convert 1-based photo ID to 0-based index
      const index = id - 1
      if (index >= 0 && index < totalCount) {
        openLightbox(index)
      }
    },
    [openLightbox],
  )

  const handleNext = useCallback(() => {
    nextPhoto(totalCount)
  }, [nextPhoto])

  const handlePrevious = useCallback(() => {
    previousPhoto(totalCount)
  }, [previousPhoto])

  const selectedPhoto = open && selectedIndex !== null
    ? photos[selectedIndex]
    : null

  return (
    <main className="app">
      {/* Decorative layers rendered before content for correct stacking */}
      <Background />
      <FloatingParticles />

      <PhotoGrid
        photos={photos}
        onPhotoClick={handlePhotoClick}
        showCaptions
      />

      <Lightbox
        photo={selectedPhoto}
        totalPhotos={totalCount}
        onClose={closeLightbox}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </main>
  )
}

export default App

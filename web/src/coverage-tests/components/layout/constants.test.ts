import { MOBILE_DRAWER_ANIMATION, MOBILE_DRAWER_CONFIG } from '@/components/layout/constants'

describe('layout constants', () => {
  describe('MOBILE_DRAWER_ANIMATION', () => {
    test('overlay has hidden, visible, and exit variants', () => {
      expect(MOBILE_DRAWER_ANIMATION.overlay.hidden).toEqual({ opacity: 0 })
      expect(MOBILE_DRAWER_ANIMATION.overlay.visible).toEqual({ opacity: 1 })
      expect(MOBILE_DRAWER_ANIMATION.overlay.exit).toEqual({ opacity: 0 })
    })

    test('drawer has hidden, visible, and exit variants', () => {
      expect(MOBILE_DRAWER_ANIMATION.drawer.hidden).toEqual({
        opacity: 0,
        y: 100,
      })
      expect(MOBILE_DRAWER_ANIMATION.drawer.visible.opacity).toBe(1)
      expect(MOBILE_DRAWER_ANIMATION.drawer.visible.y).toBe(0)
      expect(MOBILE_DRAWER_ANIMATION.drawer.exit.opacity).toBe(0)
    })

    test('menuItem has hidden and visible variants', () => {
      expect(MOBILE_DRAWER_ANIMATION.menuItem.hidden).toEqual({ opacity: 0 })
      expect(MOBILE_DRAWER_ANIMATION.menuItem.visible).toEqual({ opacity: 1 })
    })
  })

  describe('MOBILE_DRAWER_CONFIG', () => {
    test('has overlayTransitionDuration', () => {
      expect(MOBILE_DRAWER_CONFIG.overlayTransitionDuration).toBe(0.2)
    })

    test('has drawerClassName', () => {
      expect(MOBILE_DRAWER_CONFIG.drawerClassName).toContain('fixed')
      expect(MOBILE_DRAWER_CONFIG.drawerClassName).toContain('md:hidden')
    })

    test('has overlayClassName', () => {
      expect(MOBILE_DRAWER_CONFIG.overlayClassName).toContain('fixed')
      expect(MOBILE_DRAWER_CONFIG.overlayClassName).toContain('backdrop-blur')
    })
  })
})

import { describe, it, expect } from 'vitest'

import { MOTION_TRANSITION, MOTION_VARIANTS, STAGGER_VARIANTS, STAGGER_ITEM_VARIANTS, TABLE_STAGGER_VARIANTS, TABLE_ROW_VARIANTS, CARD_STAGGER_VARIANTS, CARD_ITEM_VARIANTS, SIDEBAR_STAGGER_VARIANTS, SIDEBAR_ITEM_VARIANTS } from '@/lib/motion'

describe('motion', () => {
  describe('MOTION_TRANSITION', () => {
    it('has default transition', () => {
      expect(MOTION_TRANSITION.default).toEqual({
        duration: 0.25,
        ease: [0.33, 1, 0.68, 1],
      })
    })

    it('has fast transition', () => {
      expect(MOTION_TRANSITION.fast.duration).toBe(0.15)
    })

    it('has slow transition', () => {
      expect(MOTION_TRANSITION.slow.duration).toBe(0.35)
    })

    it('has spring transition', () => {
      expect(MOTION_TRANSITION.spring).toEqual({
        type: 'spring',
        damping: 20,
        stiffness: 300,
      })
    })

    it('has none transition with zero duration', () => {
      expect(MOTION_TRANSITION.none.duration).toBe(0)
    })
  })

  describe('MOTION_VARIANTS', () => {
    it('has pageEnter variant with initial, animate, exit', () => {
      expect(MOTION_VARIANTS.pageEnter.initial).toBeDefined()
      expect(MOTION_VARIANTS.pageEnter.animate).toBeDefined()
      expect(MOTION_VARIANTS.pageEnter.exit).toBeDefined()
    })

    it('has fadeIn variant', () => {
      expect(MOTION_VARIANTS.fadeIn.initial).toEqual({ opacity: 0 })
      expect(MOTION_VARIANTS.fadeIn.animate).toEqual({ opacity: 1 })
    })

    it('has scaleIn variant', () => {
      expect(MOTION_VARIANTS.scaleIn.initial).toEqual({ opacity: 0, scale: 0.96 })
      expect(MOTION_VARIANTS.scaleIn.animate).toEqual({ opacity: 1, scale: 1 })
    })

    it('has slideUp variant', () => {
      expect(MOTION_VARIANTS.slideUp.initial).toEqual({ opacity: 0, y: 16 })
      expect(MOTION_VARIANTS.slideUp.animate).toEqual({ opacity: 1, y: 0 })
    })

    it('has slideDown variant', () => {
      expect(MOTION_VARIANTS.slideDown.initial).toEqual({ opacity: 0, y: -16 })
      expect(MOTION_VARIANTS.slideDown.animate).toEqual({ opacity: 1, y: 0 })
    })

    it('has tableRow variant', () => {
      expect(MOTION_VARIANTS.tableRow.initial).toEqual({ opacity: 0, y: 4 })
      expect(MOTION_VARIANTS.tableRow.animate).toEqual({ opacity: 1, y: 0 })
    })

    it('has cardItem variant', () => {
      expect(MOTION_VARIANTS.cardItem.initial).toEqual({ opacity: 0, y: 12, scale: 0.98 })
      expect(MOTION_VARIANTS.cardItem.animate).toEqual({ opacity: 1, y: 0, scale: 1 })
    })

    it('has sidebarSlide variant', () => {
      expect(MOTION_VARIANTS.sidebarSlide.initial).toEqual({ opacity: 0, x: -8 })
      expect(MOTION_VARIANTS.sidebarSlide.animate).toEqual({ opacity: 1, x: 0 })
    })
  })

  describe('stagger variants', () => {
    it('STAGGER_VARIANTS has staggerChildren', () => {
      const animate = STAGGER_VARIANTS.animate as { transition: { staggerChildren: number } }
      expect(animate.transition.staggerChildren).toBe(0.04)
    })

    it('STAGGER_ITEM_VARIANTS has opacity and y animation', () => {
      expect(STAGGER_ITEM_VARIANTS.initial).toEqual({ opacity: 0, y: 8 })
    })

    it('TABLE_STAGGER_VARIANTS has staggerChildren', () => {
      const animate = TABLE_STAGGER_VARIANTS.animate as { transition: { staggerChildren: number } }
      expect(animate.transition.staggerChildren).toBe(0.03)
    })

    it('TABLE_ROW_VARIANTS has opacity and y animation', () => {
      expect(TABLE_ROW_VARIANTS.initial).toEqual({ opacity: 0, y: 4 })
    })

    it('CARD_STAGGER_VARIANTS has staggerChildren', () => {
      const animate = CARD_STAGGER_VARIANTS.animate as { transition: { staggerChildren: number } }
      expect(animate.transition.staggerChildren).toBe(0.05)
    })

    it('CARD_ITEM_VARIANTS has scale', () => {
      expect(CARD_ITEM_VARIANTS.initial).toEqual({ opacity: 0, y: 12, scale: 0.98 })
    })

    it('SIDEBAR_STAGGER_VARIANTS has staggerChildren and delayChildren', () => {
      const animate = SIDEBAR_STAGGER_VARIANTS.animate as { transition: { staggerChildren: number; delayChildren: number } }
      expect(animate.transition.staggerChildren).toBe(0.03)
      expect(animate.transition.delayChildren).toBe(0.05)
    })

    it('SIDEBAR_ITEM_VARIANTS has x animation', () => {
      expect(SIDEBAR_ITEM_VARIANTS.initial).toEqual({ opacity: 0, x: -8 })
    })
  })
})

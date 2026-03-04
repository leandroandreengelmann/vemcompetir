import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
    it('should merge classes correctly', () => {
        expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
        expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2')
    })

    it('should merge tailwind classes using twMerge', () => {
        // This assumes cn uses tailwind-merge
        expect(cn('p-4', 'p-2')).toBe('p-2')
    })
})

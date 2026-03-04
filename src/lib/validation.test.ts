import { describe, it, expect } from 'vitest'
import {
    validateCPF,
    normalizeNumeric,
    formatCPF,
    formatPhone
} from './validation'

describe('Validation Utils', () => {

    describe('validateCPF', () => {
        it('should return true for a valid CPF', () => {
            // Use a real valid CPF for testing (example one from public generators)
            expect(validateCPF('12345678909')).toBe(true)
            expect(validateCPF('11144477735')).toBe(true)
        })

        it('should return false for CPF with all same digits', () => {
            expect(validateCPF('11111111111')).toBe(false)
            expect(validateCPF('00000000000')).toBe(false)
        })

        it('should return false for invalid length', () => {
            expect(validateCPF('123')).toBe(false)
            expect(validateCPF('123456789012')).toBe(false)
        })

        it('should return false for invalid digits', () => {
            expect(validateCPF('12345678900')).toBe(false)
        })

        it('should handle formatted CPFs by cleaning them first', () => {
            expect(validateCPF('123.456.789-09')).toBe(true)
        })
    })

    describe('normalizeNumeric', () => {
        it('should remove all non-numeric characters', () => {
            expect(normalizeNumeric('123.456.789-01')).toBe('12345678901')
            expect(normalizeNumeric('(66) 99999-8888')).toBe('66999998888')
            expect(normalizeNumeric('abc123def')).toBe('123')
        })

        it('should handle empty strings', () => {
            expect(normalizeNumeric('')).toBe('')
        })
    })

    describe('formatCPF', () => {
        it('should format a clean CPF string', () => {
            expect(formatCPF('12345678909')).toBe('123.456.789-09')
        })
    })

    describe('formatPhone', () => {
        it('should format 11-digit phone (cellphone with DDD)', () => {
            expect(formatPhone('66999998888')).toBe('(66) 99999-8888')
        })

        it('should format 10-digit phone (landline with DDD)', () => {
            expect(formatPhone('6634211234')).toBe('(66) 3421-1234')
        })

        it('should return original string if length is not 10 or 11', () => {
            expect(formatPhone('12345')).toBe('12345')
        })
    })
})

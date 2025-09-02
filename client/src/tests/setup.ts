import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
//Used a namespace import to avoid undefined default export issues
import * as matchers from '@testing-library/jest-dom/matchers'

// extend Vitest's expect with jest-dom matchers
expect.extend(matchers as any)

// cleanup DOM between tests
afterEach(() => cleanup())

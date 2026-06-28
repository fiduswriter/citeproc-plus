import {defineConfig} from 'vitest/config'

export default defineConfig({
    assetsInclude: ['**/*.json.gz'],
    test: {
        environment: 'node',
        testTimeout: 30000
    }
})

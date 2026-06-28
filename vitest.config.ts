import {defineConfig} from 'vitest/config'

export default defineConfig({
    plugins: [
        {
            name: 'csljson-loader',
            transform(code, id) {
                if (id.endsWith('.csljson')) {
                    return {code: `export default ${code}`, map: null}
                }
            }
        }
    ],
    test: {
        environment: 'node',
        testTimeout: 30000
    }
})

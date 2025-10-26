/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
        '**/__tests__/**/*.ts',
        '**/?(*.)+(spec|test).ts'
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/types/**',
        '!src/**/*.interface.ts'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html'
    ],
    moduleNameMapper: {
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
    testTimeout: 30000,
    projects: [
        {
            displayName: 'unit',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
            moduleNameMapper: {
                '^@application/(.*)$': '<rootDir>/src/application/$1',
                '^@domain/(.*)$': '<rootDir>/src/domain/$1',
                '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1'
            },
            setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
        },
        {
            displayName: 'integration',
            preset: 'ts-jest',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
            moduleNameMapper: {
                '^@application/(.*)$': '<rootDir>/src/application/$1',
                '^@domain/(.*)$': '<rootDir>/src/domain/$1',
                '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1'
            },
            setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts']
        }
    ]
};
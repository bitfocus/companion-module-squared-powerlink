// Import the necessary modules and classes
const runEntrypoint = require('@companion-module/base').runEntrypoint
const Powerlink = require('../powerlink')
const { InstanceStatus } = require('@companion-module/base')

// Create a mock Powerlink class
jest.mock('../powerlink')

// Mock Companion to get the class
jest.mock('@companion-module/base', () => {
	const original = jest.requireActual('@companion-module/base')
	return {
		...original,
		InstanceBase: jest.fn(),
		runEntrypoint: jest.fn(),
	}
})

// Define the test suite for ModuleInstance
describe('ModuleInstance', () => {
	let instance

	const ModuleInstance = require('../main')
	const module = runEntrypoint.mock.calls[0][0]

	beforeEach(() => {
		instance = new module('')
		instance.updateStatus = jest.fn()
		instance.log = jest.fn()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('init', () => {
		test('should initialize the device and update status', async () => {
			// Mock the necessary methods
			instance.initDevice = jest.fn()
			instance.updateVariableDefinitions = jest.fn()
			instance.updateChoices = jest.fn()
			instance.updateActions = jest.fn()
			instance.updateFeedbacks = jest.fn()

			// Mock the config
			const config = { host: '127.0.0.1' }

			// Invoke the method
			await instance.init(config)

			// Assertions
			expect(instance.config).toEqual(config)
			expect(instance.updateStatus).toHaveBeenCalledWith(InstanceStatus.Ok)
			expect(instance.initDevice).toHaveBeenCalled()
			expect(instance.updateVariableDefinitions).toHaveBeenCalled()
			expect(instance.updateActions).toHaveBeenCalled()
			expect(instance.updateFeedbacks).toHaveBeenCalled()
		})
	})

	describe('initDevice', () => {
		test('should initialize the device when host is defined', async () => {
			// Mock the necessary methods and properties
			instance.config = { host: '127.0.0.1' }
			instance.updateStatus = jest.fn()
			instance.device = null

			// Invoke the method
			await instance.initDevice()

			// Assertions
			expect(instance.updateStatus).toHaveBeenCalledWith('connecting', 'Connecting')
			expect(Powerlink).toHaveBeenCalledWith('127.0.0.1')
			// expect(instance.device.getPanelInfo).toHaveBeenCalled()
			expect(instance.updateStatus).toHaveBeenCalledWith('ok')
		})

		test('should not initialize the device when host is undefined', async () => {
			// Mock the necessary methods and properties
			instance.config = {}
			instance.updateStatus = jest.fn()
			instance.device = null

			// Invoke the method
			await instance.initDevice()

			// Assertions
			expect(instance.updateStatus).not.toHaveBeenCalled()
			expect(Powerlink).not.toHaveBeenCalled()
		})

		test('should handle error and update status when an exception occurs', async () => {
			// Mock the necessary methods and properties
			instance.config = { host: '127.0.0.1' }
			instance.updateStatus = jest.fn()
			instance.log = jest.fn()
			instance.device = null
			instance.startConnectionTimer = jest.fn()

			// Mock the error
			const mockError = new Error('Some error message')
			Powerlink.mockImplementationOnce(() => {
				throw mockError
			})

			// Invoke the method
			await instance.initDevice()

			// Assertions
			expect(instance.updateStatus).toHaveBeenCalledWith('error', mockError.message)
			expect(instance.log).toHaveBeenCalledWith('error', 'Network error: ' + mockError.message)
			expect(instance.device).toBeUndefined()
			expect(instance.deviceInfo).toBeUndefined()
			expect(instance.startConnectionTimer).toHaveBeenCalled()
		})

		test('should handle error and update status when timeout happens', async () => {
			// Mock the necessary methods and properties
			instance.config = { host: '127.0.0.1' }
			instance.updateStatus = jest.fn()
			instance.log = jest.fn()
			instance.device = null
			instance.startConnectionTimer = jest.fn()

			// Mock the error
			const mockError = new Error('Unable to connect')
			Powerlink.mockImplementationOnce(() => {
				throw mockError
			})

			// Invoke the method
			await instance.initDevice()

			// Assertions
			expect(instance.updateStatus).toHaveBeenCalledWith(InstanceStatus.Disconnected)
			expect(instance.device).toBeUndefined()
			expect(instance.deviceInfo).toBeUndefined()
			expect(instance.startConnectionTimer).toHaveBeenCalled()
		})
	})

	describe('destroy', () => {
		test('should stop timers and reset properties', () => {
			// Mock the necessary methods and properties
			instance.stopConnectionTimer = jest.fn()

			// Invoke the method
			instance.destroy()

			// Assertions
			expect(instance.stopConnectionTimer).toHaveBeenCalled()
			expect(instance.device).toBeUndefined()
			expect(instance.deviceState).toEqual(undefined)
			expect(instance.log).toHaveBeenCalledWith('debug', 'destroy')
		})
	})

	describe('configUpdated', () => {
		test('should update the config and initialize the device', async () => {
			// Mock the necessary methods
			instance.stopConnectionTimer = jest.fn()
			instance.initDevice = jest.fn()
			instance.config = { host: '10.101.101.101' }
            instance.updateChoices = jest.fn()
            instance.updateActions = jest.fn()

			// Mock the config
			const config = { host: '127.0.0.1' }

			// Invoke the method
			await instance.configUpdated(config)

			// Assertions
			expect(instance.config).toEqual(config)
			expect(instance.stopConnectionTimer).toHaveBeenCalled()
			expect(instance.initDevice).toHaveBeenCalled()
		})
	})

	describe('getConfigFields', () => {
		test('should return an array of config fields', () => {
			// Invoke the method
            instance.config = {
                supportsManualAdjustments: false
            }
			const configFields = instance.getConfigFields()
            

			// Assertions
			expect(Array.isArray(configFields)).toBe(true)
			expect(configFields.length).toBe(4)
			expect(configFields[0]).toEqual({
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: '/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/',
			})
		})
	})
})

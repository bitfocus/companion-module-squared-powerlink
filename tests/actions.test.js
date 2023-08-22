// Import the function and helper function
const actions = require('../actions')
const clamp = require('../actions').clamp
const buildActionOptionBreakers = require('../actions').buildActionOptionBreakers

describe('Module Tests', () => {
	let self

	beforeEach(() => {
		self = {
			setActionDefinitions: jest.fn(),
			device: {
				init: jest.fn(),
				close: jest.fn(),
				setBreakerInfoByPanel: jest.fn(),
			},
			config: {
				shouldFilter: false,
				breakerMax: 42,
				panelMax: 8,
			},
			deviceState: undefined,
			getStates: jest.fn(),
			log: jest.fn(),
			getVariableValue: jest.fn(),
			setVariableValues: jest.fn(),
			CHOICES_PANELS: [
				{
					id: 0,
					label: `Panel 1 - 0L+0R`,
				},
			],
			CHOICES_BREAKERS: [
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
			],
		}
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should set actions to companion', () => {
		actions(self)
		expect(self.setActionDefinitions).toHaveBeenCalled()
	})

	it('should not have an empty tooltip.', async () => {
		await actions(self)
		const moduleActions = self.setActionDefinitions.mock.calls[0][0]

		// make sure each one doesn't have an empty tooltip
		for (const key in moduleActions) {
			if (Object.hasOwnProperty.call(moduleActions, key)) {
				const element = moduleActions[key]

				// go through all the options
				element.options.forEach((each) => {
					if (each.tooltip !== undefined) {
						expect(each.tooltip.length).toBeGreaterThan(0)
					} else {
						expect(each.tooltip).toBeUndefined()
					}
				})
			}
		}
	})

	describe('controlBreaker Tests', () => {
		it('should turn on a breaker', async () => {
			const event = {
				options: {
					panel: 0,
					panel0Breaker: 1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					value: 1,
				},
			}

			await actions(self)
			const { controlBreaker } = self.setActionDefinitions.mock.calls[0][0]

			// test the callback
			expect(self.setActionDefinitions).toHaveBeenCalled()
			await controlBreaker.callback(event)

			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 1, [{ directBreakerControl: 1 }])
		})

		it('should log when it has an error', async () => {
			const event = {
				name: 'Direct Breaker Control',
				options: {
					panel: 0,
					panel0Breaker: 1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					value: 1,
				},
			}

			await actions(self)
			const { controlBreaker } = self.setActionDefinitions.mock.calls[0][0]
			// test the callback

			// set the mock to reject
			self.device.setBreakerInfoByPanel.mockRejectedValueOnce(new Error('Mocked error'))

			const result = await controlBreaker.callback(event)
			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.log).toHaveBeenCalledWith('error', 'Unable to complete Action (Direct Breaker Control): Mocked error')
			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 1, [{ directBreakerControl: 1 }])
		})

		it('should throw an error when the value is -1', async () => {
			const event = {
				name: 'Direct Breaker Control',
				options: {
					panel: 0,
					panel0Breaker: -1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					value: 1,
				},
			}

			await actions(self)
			const { controlBreaker } = self.setActionDefinitions.mock.calls[0][0]
			// test the callback
			await controlBreaker.callback(event)
			expect(self.device.init).not.toHaveBeenCalled()
			expect(self.device.close).not.toHaveBeenCalled()

			expect(self.log).toHaveBeenCalledWith(
				'error',
				'Unable to complete Action (Direct Breaker Control): The selected breaker is empty.'
			)
			expect(self.device.setBreakerInfoByPanel).not.toHaveBeenCalled()
		})

		it('should turn off a breaker', async () => {
			const event = {
				options: {
					panel: 0,
					panel0Breaker: 1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					value: 0,
				},
			}

			await actions(self)
			const { controlBreaker } = self.setActionDefinitions.mock.calls[0][0]

			// test the callback
			expect(self.setActionDefinitions).toHaveBeenCalled()
			await controlBreaker.callback(event)

			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 1, [{ directBreakerControl: 0 }])
		})

		it('should turn on a breaker from panel 1', async () => {
			const event = {
				options: {
					panel: 1,
					panel0Breaker: 1,
					panel1Breaker: 42,
					panel2Breaker: 3,
					panel3Breaker: 4,
					panel4Breaker: 5,
					panel5Breaker: 6,
					panel6Breaker: 7,
					panel7Breaker: 8,
					value: 1,
				},
			}

			await actions(self)
			const { controlBreaker } = self.setActionDefinitions.mock.calls[0][0]

			// test the callback
			expect(self.setActionDefinitions).toHaveBeenCalled()
			await controlBreaker.callback(event)

			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(1, 42, [{ directBreakerControl: 1 }])
		})
	})

	describe('controlMultipleBreaker Tests', () => {
		it('should turn on multiple breakers', async () => {
			const event = {
				options: {
					panel: 0,
					panel0Breaker: 1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					quantity: 3,
					value: 1,
				},
			}

			await actions(self)
			const { controlMultipleBreaker } = self.setActionDefinitions.mock.calls[0][0]

			// test the callback
			expect(self.setActionDefinitions).toHaveBeenCalled()
			await controlMultipleBreaker.callback(event)

			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 1, [
				{ directBreakerControl: 1 },
				{ directBreakerControl: 1 },
				{ directBreakerControl: 1 },
			])
		})

		it('should turn on breaker 41 and 42 but not send commands cover 42', async () => {
			const event = {
				options: {
					panel: 0,
					panel0Breaker: 41,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					quantity: 3,
					value: 1,
				},
			}

			self.CHOICES_PANELS = [
				{
					id: 0,
					label: `Panel 1 - 0L+0R`,
				},
			]

			await actions(self)
			const { controlMultipleBreaker } = self.setActionDefinitions.mock.calls[0][0]

			// test the callback
			expect(self.setActionDefinitions).toHaveBeenCalled()
			await controlMultipleBreaker.callback(event)

			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 41, [
				{ directBreakerControl: 1 },
				{ directBreakerControl: 1 },
			])
		})

		it('should log when controlMultipleBreaker has an error', async () => {
			const event = {
				name: 'Direct Breaker Control(Multi)',
				options: {
					panel: 0,
					panel0Breaker: 1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					quantity: 1,
					value: 1,
				},
			}

			await actions(self)
			const { controlMultipleBreaker } = self.setActionDefinitions.mock.calls[0][0]
			// test the callback

			// set the mock to reject
			self.device.setBreakerInfoByPanel.mockRejectedValueOnce(new Error('Mocked error'))

			await controlMultipleBreaker.callback(event)
			expect(self.device.init).toHaveBeenCalled()
			expect(self.device.close).toHaveBeenCalled()

			expect(self.log).toHaveBeenCalledWith(
				'error',
				'Unable to complete Action (Direct Breaker Control(Multi)): Mocked error'
			)
			expect(self.device.setBreakerInfoByPanel).toHaveBeenCalledWith(0, 1, [{ directBreakerControl: 1 }])
		})

		it('should throw an error when the value is -1', async () => {
			const event = {
				name: 'Direct Breaker Control(Multi)',
				options: {
					panel: 0,
					panel0Breaker: -1,
					panel1Breaker: 1,
					panel2Breaker: 1,
					panel3Breaker: 1,
					panel4Breaker: 1,
					panel5Breaker: 1,
					panel6Breaker: 1,
					panel7Breaker: 1,
					quantity: 1,
					value: 1,
				},
			}

			await actions(self)
			const { controlMultipleBreaker } = self.setActionDefinitions.mock.calls[0][0]
			// test the callback
			await controlMultipleBreaker.callback(event)
			expect(self.device.init).not.toHaveBeenCalled()
			expect(self.device.close).not.toHaveBeenCalled()

			expect(self.log).toHaveBeenCalledWith(
				'error',
				'Unable to complete Action (Direct Breaker Control(Multi)): The selected breaker is empty.'
			)
			expect(self.device.setBreakerInfoByPanel).not.toHaveBeenCalled()
		})
	})

	describe('buildActionOptionBreakers Tests', () => {
		it('returns an array with the correct length', () => {
			const panelMax = 3
			const breakerChoices = [
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
			]
			const result = buildActionOptionBreakers(panelMax, breakerChoices)
			expect(result).toHaveLength(panelMax)
		})
		it('has the correct structure for each built option', () => {
			const panelMax = 2
			const breakerChoices = [
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
			]
			const result = buildActionOptionBreakers(panelMax, breakerChoices)
			result.forEach((option, index) => {
				expect(option).toHaveProperty('id', `panel${index}Breaker`)
				expect(option).toHaveProperty('type', 'dropdown')
				expect(option).toHaveProperty('label', 'Breaker')
				expect(option).toHaveProperty('isVisible')
				expect(option).toHaveProperty('isVisibleData', index)
				expect(option).toHaveProperty('default', breakerChoices[index]?.[0].id ?? 1)
				expect(option).toHaveProperty('choices', breakerChoices[index])
			})
		})

		it('sets default to 1 if no breaker choices provided', () => {
			const panelMax = 1
			const breakerChoices = []
			const result = buildActionOptionBreakers(panelMax, breakerChoices)
			expect(result[0].default).toBe(1)
		})

		it('correctly sets isVisible function', () => {
			const panelMax = 2
			const breakerChoices = [
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
				[{ id: 1, label: 'Breaker 1' }],
			]
			const result = buildActionOptionBreakers(panelMax, breakerChoices)
			expect(result[0].isVisible({ panel: 2 }, 3)).toBe(false)
			expect(result[0].isVisible({ panel: 1 }, 1)).toBe(true)
		})

		it('correctly handles empty breakerChoices array', () => {
			const panelMax = 2
			const breakerChoices = []
			const result = buildActionOptionBreakers(panelMax, breakerChoices)
			expect(result[0].choices).toEqual([])
			expect(result[1].choices).toEqual([])
		})
	})

	it('should clamp a value between min and max', () => {
		expect(clamp(10, 0, 100)).toBe(10)
		expect(clamp(-10, 0, 100)).toBe(0)
		expect(clamp(200, 0, 100)).toBe(100)
	})
})

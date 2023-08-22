// Import the function and helper function
const { getBreakerChoicesbyPanel, getPanelChoices } = require('../choices')
describe('Choices Tests', () => {
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
			},
			deviceState: undefined,
			getStates: jest.fn(),
			log: jest.fn(),
			getVariableValue: jest.fn(),
			setVariableValues: jest.fn(),
		}
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getPanelChoices Tests', () => {
		it('returns panel choices with all panels when no deviceState is provided', () => {
			const self = {
				deviceState: undefined,
				config: {
					shouldFilter: true,
					panelMax: 8,
				},
			}

			const result = getPanelChoices(self)
			// You can add your assertions here to check if the result matches the expected output
			// For example, you can check the length of the result array and individual labels
			expect(result.length).toBe(self.config.panelMax)
			// console.log('result', result)
			expect(result).toEqual([
				{ id: 0, label: 'Panel 1 - 0L+0R' },
				{ id: 1, label: 'Panel 2 - 1L+1R' },
				{ id: 2, label: 'Panel 3 - 2L+2R' },
				{ id: 3, label: 'Panel 4 - 3L+3R' },
				{ id: 4, label: 'Panel 5 - 4L+4R' },
				{ id: 5, label: 'Panel 6 - 5L+5R' },
				{ id: 6, label: 'Panel 7 - 6L+6R' },
				{ id: 7, label: 'Panel 8 - 7L+7R' },
			])
		})

		it('returns generic panel choices with all panels when panels are not present', () => {
			const self = {
				deviceState: {
					panels: [],
				},
				config: {
					shouldFilter: true,
					panelMax: 8,
				},
			}

			const panels = []
			for (let index = 0; index < self.config.panelMax; index++) {
				panels.push({
					id: index,
					nameTag: 'Test Name' + index,
					busL: {
						id: index * 2,
						nameTag: 'Test Name' + index,
						present: 0,
					},
					busR: {
						id: index * 2 + 1,
						nameTag: 'Test Name' + index,
						present: 0,
					},
				})
			}
			self.deviceState.panels = panels

			const result = getPanelChoices(self)

			// console.log('result', result)
			expect(result.length).toBe(1)

			expect(result).toEqual([{ id: -1, label: 'No Panels Present (turn off Hide Disconnected in config to see all)' }])
		})

		it('returns panel choices with all panels when deviceState is provided', () => {
			const self = {
				deviceState: {
					panels: [],
				},
				config: {
					shouldFilter: true,
					panelMax: 8,
				},
			}

			const panels = []
			for (let index = 0; index < self.config.panelMax; index++) {
				panels.push({
					id: index,
					nameTag: 'Test Name' + index,
					busL: {
						id: index * 2,
						nameTag: 'Test Name' + index,
						present: 1,
					},
					busR: {
						id: index * 2 + 1,
						nameTag: 'Test Name' + index,
						present: 1,
					},
				})
			}
			self.deviceState.panels = panels

			const result = getPanelChoices(self)

			// console.log('result', result)
			expect(result.length).toBe(self.config.panelMax)

			expect(result).toEqual([
				{ id: 0, label: 'Panel 1 - Test Name0' },
				{ id: 1, label: 'Panel 2 - Test Name1' },
				{ id: 2, label: 'Panel 3 - Test Name2' },
				{ id: 3, label: 'Panel 4 - Test Name3' },
				{ id: 4, label: 'Panel 5 - Test Name4' },
				{ id: 5, label: 'Panel 6 - Test Name5' },
				{ id: 6, label: 'Panel 7 - Test Name6' },
				{ id: 7, label: 'Panel 8 - Test Name7' },
			])
		})

		it('returns panel choices with all panels when deviceState is provided ', () => {
			const self = {
				deviceState: {
					panels: [],
				},
				config: {
					shouldFilter: true,
					panelMax: 4,
				},
			}

			const panels = []
			for (let index = 0; index < self.config.panelMax; index++) {
				panels.push({
					id: index,
					nameTag: 'Test Name' + index,
					busL: {
						id: index * 2,
						nameTag: 'Test Name' + index,
						present: 1,
					},
					busR: {
						id: index * 2 + 1,
						nameTag: 'Test Name' + index,
						present: 1,
					},
				})
			}
			self.deviceState.panels = panels

			const result = getPanelChoices(self)

			// console.log('result', result)
			expect(result.length).toBe(self.config.panelMax)

			expect(result).toEqual([
				{ id: 0, label: 'Panel 1 - Test Name0' },
				{ id: 1, label: 'Panel 2 - Test Name1' },
				{ id: 2, label: 'Panel 3 - Test Name2' },
				{ id: 3, label: 'Panel 4 - Test Name3' },
			])
		})

		it('returns panel choices with all panels when shouldFilter is false', () => {
			const self = {
				deviceState: {
					panels: [],
				},
				config: {
					shouldFilter: false,
					panelMax: 8,
				},
			}

			const panels = []
			for (let index = 0; index < self.config.panelMax; index++) {
				panels.push({
					id: index,
					nameTag: 'Test Name' + index,
					busL: {
						id: index * 2,
						nameTag: 'Test Name' + index,
						present: 1,
					},
					busR: {
						id: index * 2 + 1,
						nameTag: 'Test Name' + index,
						present: 1,
					},
				})
			}
			self.deviceState.panels = panels

			const result = getPanelChoices(self)

			// console.log('result', result)
			expect(result.length).toBe(self.config.panelMax)

			expect(result).toEqual([
				{ id: 0, label: 'Panel 1 - Test Name0' },
				{ id: 1, label: 'Panel 2 - Test Name1' },
				{ id: 2, label: 'Panel 3 - Test Name2' },
				{ id: 3, label: 'Panel 4 - Test Name3' },
				{ id: 4, label: 'Panel 5 - Test Name4' },
				{ id: 5, label: 'Panel 6 - Test Name5' },
				{ id: 6, label: 'Panel 7 - Test Name6' },
				{ id: 7, label: 'Panel 8 - Test Name7' },
			])
		})

		it('should generate unfiltered panel choices when shouldFilter is false', () => {
			const self = {
				deviceState: {
					panels: [
						{ id: 0, nameTag: 'Panel A', busL: { present: false }, busR: { present: true } },
						{ id: 1, nameTag: 'Panel B', busL: { present: true }, busR: { present: true } },
						{ id: 2, nameTag: 'Panel C', busL: { present: false }, busR: { present: true } },
						{ id: 3, nameTag: 'Panel D', busL: { present: false }, busR: { present: true } },
						{ id: 4, nameTag: 'Panel E', busL: { present: true }, busR: { present: false } },
						{ id: 5, nameTag: 'Panel F', busL: { present: false }, busR: { present: false } },
						{ id: 6, nameTag: 'Panel G', busL: { present: false }, busR: { present: true } },
						{ id: 7, nameTag: 'Panel H', busL: { present: false }, busR: { present: true } },
					],
				},
				config: { shouldFilter: false, panelMax: 8 },
			}
			const result = getPanelChoices(self)
			// console.log('result', result)

			expect(result).toHaveLength(8)
			expect(result).toEqual([
				{ id: 0, label: 'Panel 1 - Panel A - Bus L Absent' },
				{ id: 1, label: 'Panel 2 - Panel B' },
				{ id: 2, label: 'Panel 3 - Panel C - Bus L Absent' },
				{ id: 3, label: 'Panel 4 - Panel D - Bus L Absent' },
				{ id: 4, label: 'Panel 5 - Panel E - Bus R Absent' },
				{ id: 5, label: 'Panel 6 - Panel F - Absent' },
				{ id: 6, label: 'Panel 7 - Panel G - Bus L Absent' },
				{ id: 7, label: 'Panel 8 - Panel H - Bus L Absent' },
			])
		})
	})

	describe('getBreakerChoicesbyPanel Tests', () => {
		it('returns breaker choices with all panels when no deviceState is provided', () => {
			const self = {
				deviceState: undefined,
				config: {
					shouldFilter: true,
					breakerMax: 42,
				},
			}
			const result = getBreakerChoicesbyPanel(self, 0)

			expect(result.length).toBe(self.config.breakerMax)
			// console.log('result', result)
			expect(result).toEqual([
				{ id: 1, label: 'Breaker 1 - 1L' },
				{ id: 2, label: 'Breaker 2 - 1R' },
				{ id: 3, label: 'Breaker 3 - 2L' },
				{ id: 4, label: 'Breaker 4 - 2R' },
				{ id: 5, label: 'Breaker 5 - 3L' },
				{ id: 6, label: 'Breaker 6 - 3R' },
				{ id: 7, label: 'Breaker 7 - 4L' },
				{ id: 8, label: 'Breaker 8 - 4R' },
				{ id: 9, label: 'Breaker 9 - 5L' },
				{ id: 10, label: 'Breaker 10 - 5R' },
				{ id: 11, label: 'Breaker 11 - 6L' },
				{ id: 12, label: 'Breaker 12 - 6R' },
				{ id: 13, label: 'Breaker 13 - 7L' },
				{ id: 14, label: 'Breaker 14 - 7R' },
				{ id: 15, label: 'Breaker 15 - 8L' },
				{ id: 16, label: 'Breaker 16 - 8R' },
				{ id: 17, label: 'Breaker 17 - 9L' },
				{ id: 18, label: 'Breaker 18 - 9R' },
				{ id: 19, label: 'Breaker 19 - 10L' },
				{ id: 20, label: 'Breaker 20 - 10R' },
				{ id: 21, label: 'Breaker 21 - 11L' },
				{ id: 22, label: 'Breaker 22 - 11R' },
				{ id: 23, label: 'Breaker 23 - 12L' },
				{ id: 24, label: 'Breaker 24 - 12R' },
				{ id: 25, label: 'Breaker 25 - 13L' },
				{ id: 26, label: 'Breaker 26 - 13R' },
				{ id: 27, label: 'Breaker 27 - 14L' },
				{ id: 28, label: 'Breaker 28 - 14R' },
				{ id: 29, label: 'Breaker 29 - 15L' },
				{ id: 30, label: 'Breaker 30 - 15R' },
				{ id: 31, label: 'Breaker 31 - 16L' },
				{ id: 32, label: 'Breaker 32 - 16R' },
				{ id: 33, label: 'Breaker 33 - 17L' },
				{ id: 34, label: 'Breaker 34 - 17R' },
				{ id: 35, label: 'Breaker 35 - 18L' },
				{ id: 36, label: 'Breaker 36 - 18R' },
				{ id: 37, label: 'Breaker 37 - 19L' },
				{ id: 38, label: 'Breaker 38 - 19R' },
				{ id: 39, label: 'Breaker 39 - 20L' },
				{ id: 40, label: 'Breaker 40 - 20R' },
				{ id: 41, label: 'Breaker 41 - 21L' },
				{ id: 42, label: 'Breaker 42 - 21R' },
			])
		})

		it('should return "No Breakers Present" when panelInfo is undefined', () => {
			const self = {
				deviceState: { panelsWithBreakers: [] },
				config: {
					shouldFilter: true,
					breakerMax: 42,
				},
			}
			const panel = 2
			const result = getBreakerChoicesbyPanel(self, panel)
			expect(result).toHaveLength(1)
			expect(result).toEqual([
				{
					id: -1,
					label: 'No Breakers Present (turn off Hide Disconnected in config to see all)',
				},
			])
		})

		it('should return filtered breaker choices when shouldFilter is true', () => {
			const self = {
				deviceState: {
					panelsWithBreakers: [
						{
							id: 0,
							breakers: [
								{ id: 1, present: true, nameTag: 'Name' },
								{ id: 2, present: false, nameTag: 'Name' },
							],
						},
					],
				},
				config: {
					shouldFilter: true,
					breakerMax: 42,
				},
			}
			const panel = 0
			const result = getBreakerChoicesbyPanel(self, panel)
			// console.log('result', result)

			expect(result).toHaveLength(1)
			expect(result[0].label).toBe('Breaker 1 - Name')
		})

		// it('should return filtered breaker choices with "Absent" when breaker is not present', () => {
		// 	const self = {
		// 		deviceState: {
		// 			panelsWithBreakers: [{ id: 1, breakers: [{ id: 1, present: false, nameTag: 'Name' }] }],
		// 		},
		// 		config: { shouldFilter: true },
		// 	}
		// 	const panel = 1
		// 	const result = getBreakerChoicesbyPanel(self, panel)
		// 	expect(result).toHaveLength(1)
		// 	expect(result[0].label).toBe('Breaker 1 - Name - Absent')
		// })

		it('should return unfiltered breaker choices with default nameTag when shouldFilter is false', () => {
			const self = {
				deviceState: {
					panelsWithBreakers: [{ id: 0, breakers: [{ id: 1, present: true, nameTag: '' }] }],
				},
				config: { shouldFilter: false },
			}
			const panel = 0
			const result = getBreakerChoicesbyPanel(self, panel)
			expect(result).toHaveLength(1)
			expect(result[0].label).toBe('Breaker 1 - 1L')
		})

		it('should return unfiltered breaker choices with default nameTag and Absent when shouldFilter is false when the breaker is not present', () => {
			const self = {
				deviceState: {
					panelsWithBreakers: [
						{
							id: 0,
							breakers: [
								{ id: 1, present: true, nameTag: '' },
								{ id: 2, present: false, nameTag: '' },
							],
						},
					],
				},
				config: { shouldFilter: false },
			}
			const panel = 0
			const result = getBreakerChoicesbyPanel(self, panel)
			expect(result).toHaveLength(2)
			expect(result[0].label).toBe('Breaker 1 - 1L')
			expect(result[1].label).toBe('Breaker 2 - 1R - Absent')
		})
	})
})

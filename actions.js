module.exports = function (self) {
	// get the amount of panels

	self.setActionDefinitions({
		controlBreaker: {
			name: 'Direct Breaker Control',
			options: [
				{
					id: 'panel',
					type: 'dropdown',
					label: 'Panel',
					default: self.CHOICES_PANELS[0]?.id ?? 0,
					choices: self.CHOICES_PANELS,
				},
				...buildActionOptionBreakers(self.config.panelMax, self.CHOICES_BREAKERS),
				{
					id: 'value',
					type: 'dropdown',
					label: 'On/Off',
					default: 1,
					choices: [
						{ label: 'ON', id: 1 },
						{ label: 'OFF', id: 0 },
					],
				},
			],
			callback: async (event) => {
				const panelNumber = event.options.panel
				const breakerNumber = event.options[`panel${panelNumber}Breaker`]
				
				if (breakerNumber === -1) {
					self.log('error', `Unable to complete Action (${event.name}): The selected breaker is empty.`)
					return
				}

				await self.device.init()
				try {
					await self.device.setBreakerInfoByPanel(panelNumber, breakerNumber, [
						{
							directBreakerControl: event.options.value,
						},
					])
				} catch (error) {
					self.log('error', `Unable to complete Action (${event.name}): ${error.message}`)
					console.error(error)
				}

				await self.device.close()
			},
		},
		controlMultipleBreaker: {
			name: 'Direct Breaker Control(Multi)',
			options: [
				{
					id: 'panel',
					type: 'dropdown',
					label: 'Panel',
					default: self.CHOICES_PANELS[0]?.id ?? 0,
					choices: self.CHOICES_PANELS,
				},
				...buildActionOptionBreakers(self.config.panelMax, self.CHOICES_BREAKERS),
				{
					id: 'quantity',
					type: 'number',
					label: 'Quantity',
					default: 1,
					min: 1,
					max: self.config.breakerMax,
				},
				{
					id: 'value',
					type: 'dropdown',
					label: 'On/Off',
					default: 1,
					choices: [
						{ label: 'ON', id: 1 },
						{ label: 'OFF', id: 0 },
					],
				},
			],
			callback: async (event) => {
				const { panel: panelNumber, value } = event.options
				const breakerNumber = event.options[`panel${panelNumber}Breaker`]
				let { quantity } = event.options

				if (breakerNumber === -1) {
					self.log('error', `Unable to complete Action (${event.name}): The selected breaker is empty.`)
					return
				}

				// Make sure the user can't go over the number of breakers in the panel
				quantity = clamp(quantity, 1, self.config.breakerMax - breakerNumber + 1)

				const values = []
				for (let index = 0; index < quantity; index++) {
					values.push({
						directBreakerControl: value,
					})
				}

				await self.device.init()
				try {
					await self.device.setBreakerInfoByPanel(panelNumber, breakerNumber, values)
				} catch (error) {
					self.log('error', `Unable to complete Action (${event.name}): ${error.message}`)
					console.error(error)
				}

				await self.device.close()
			},
		},
	})
}

const buildActionOptionBreakers = (panelMax, breakerChoices) => {
	const builtOptions = []

	for (let index = 0; index < panelMax; index++) {
		builtOptions.push({
			id: `panel${index}Breaker`,
			type: 'dropdown',
			label: 'Breaker',
			isVisible: (options, panelIndex) => options.panel === panelIndex,
			isVisibleData: index,
			default: breakerChoices[index]?.[0].id ?? 1,
			choices: breakerChoices[index] ?? [],
		})
	}

	return builtOptions
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

module.exports.clamp = clamp
module.exports.buildActionOptionBreakers = buildActionOptionBreakers

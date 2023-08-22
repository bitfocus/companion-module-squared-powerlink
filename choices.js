const ChoicesManager = {
	getPanelChoices: (self) => {
		const { deviceState, config } = self
		const panelChoices = []

		const hasPanels = deviceState?.panels !== undefined

		if (!hasPanels) {
			for (let index = 0; index < config.panelMax; index++) {
				panelChoices.push({ id: index, label: `Panel ${index + 1} - ${index}L+${index}R` })
			}
		} else {
			panelChoices.push(...ChoicesManager.generatePanelChoices(deviceState.panels, config.shouldFilter))
		}
		return panelChoices
	},

	generatePanelChoices: (panels, shouldFilter) => {
		if (shouldFilter) {
			panels = panels.filter((each) => each.busL.present || each.busR.present)

			if (panels.length === 0) {
				return [
					{
						id: -1, // change this to -1 to make sure this doesn't get called for some reason
						label: 'No Panels Present (turn off Hide Disconnected in config to see all)',
					},
				]
			}
		}

		return panels.map((panel) => {
			let presence = ''

			if (!panel.busL.present && !panel.busR.present) {
				presence = ' - Absent'
			} else if (!panel.busL.present || !panel.busR.present) {
				presence = ` - Bus ${!panel.busL.present ? 'L' : 'R'} Absent`
			}
			const name = panel.nameTag === '' ? '' : ` - ${panel.nameTag}`

			return {
				id: panel.id,
				label: `Panel ${panel.id + 1}${name}${presence}`,
			}
		})
	},

	getBreakerChoicesbyPanel: (self, panel) => {
		const breakerChoices = []
		const { config, deviceState } = self
		const hasPanelsWithBreakers = deviceState?.panelsWithBreakers !== undefined

		if (!hasPanelsWithBreakers) {
			for (let index = 0; index < config.breakerMax; index++) {
				const side = index % 2 ? 'R' : 'L'
				breakerChoices.push({ id: index + 1, label: `Breaker ${index + 1} - ${Math.floor(index / 2) + 1}${side}` })
			}
		} else {
			breakerChoices.push(
				...ChoicesManager.generateBreakerChoices(panel, deviceState.panelsWithBreakers, config.shouldFilter)
			)
		}
		return breakerChoices
	},
	generateBreakerChoices: (panelId, panelsWithBreakers, shouldFilter) => {
		const noBreakers = [
			{
				id: -1,
				label: 'No Breakers Present (turn off Hide Disconnected in config to see all)',
			},
		]
		const panelInfo = panelsWithBreakers.find((each) => each.id === panelId)
		if (panelInfo === undefined) {
			return noBreakers
		}
		let { breakers = [] } = panelInfo

		if (shouldFilter) {
			breakers = breakers.filter((each) => each.present)
			if (breakers.length === 0) {
				return noBreakers
			}
		}

		return breakers.map((each, index) => {
			let nameTag = ''
			let absent = ''
			if (each.nameTag !== '') {
				nameTag = ` - ${each.nameTag}`
			} else {
				const side = index % 2 ? 'R' : 'L'
				nameTag = ` - ${Math.floor(index / 2) + 1}${side}`
			}
			if (!each.present) {
				absent = ' - Absent'
			}
			return {
				id: each.id,
				label: `Breaker ${each.id}${nameTag}${absent}`,
			}
		})
	},
}

module.exports = ChoicesManager

const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateChoices = require('./choices')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

const Powerlink = require('./powerlink')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.config.supportsManualAdjustments = false
		this.config.connectionTestFrequency = 5000

		this.updateChoices()
		this.updateActions()

		this.updateStatus(InstanceStatus.Ok)
		await this.initDevice()

		this.updateChoices()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}

	async initDevice() {
		if (this.config.host === undefined) {
			return
		}
		try {
			this.updateStatus('connecting', 'Connecting')
			this.device = new Powerlink(this.config.host)
			const connectionTimeout = 500

			const deviceInitPromise = this.device.init()

			const connectionTimeoutPromise = new Promise((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Unable to connect to ${this.device.host}:${this.device.port}`))
				}, connectionTimeout)
			})
			await Promise.race([deviceInitPromise, connectionTimeoutPromise])

			this.stopConnectionTimer()
			this.deviceState = {}
			this.updateStatus('ok')
		} catch (error) {
			if (error.message.includes('connect')) {
				this.updateStatus(InstanceStatus.Disconnected)
				this.log('error', error.message)
			} else {
				this.updateStatus('error', error.message)
				this.log('error', 'Network error: ' + error.message)
			}

			// try to reconnect
			this.startConnectionTimer()
			this.device = undefined
			return
		}

		// get breaker info
		if (this.device.connection !== undefined) {
			try {
				console.log('getting breaker info')
				// get the buses active to know what breakers are active

				this.deviceState.panels = await this.device.getPanelInfo(0, 8)

				let { panels } = this.deviceState
				if (this.config.shouldFilter) {
					// get only the breakers that are on active panels.
					panels = panels.filter((each) => each.busL.present || each.busR.present)
				}

				const allData = []
				const panelsLength = panels.length
				for (let index = 0; index < panelsLength; index++) {
					const data = await this.device.getBreakerInfoByPanel(panels[index].id, 1, 42, [
						'id',
						'busNumber',
						'state',
						'nameTag',
						'present',
					])
					allData.push({
						id: panels[index].id,
						breakers: data,
					})
				}
				this.deviceState.panelsWithBreakers = allData
			} catch (error) {
				console.error(error)
			}
		}

		this.device.close()
	}

	startConnectionTimer() {
		this.log('debug', 'Starting ConnectionTimer')
		this.connectionTimer = setTimeout(() => this.initDevice(), this.config.connectionTestFrequency);
	}

	stopConnectionTimer() {
		this.log('debug', 'Stopping ConnectionTimer')
		if (this.connectionTimer !== undefined) {
			clearTimeout(this.connectionTimer)
		}
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		if (this.device) {
			this.device.close()
			this.device = undefined
			this.deviceState = undefined
		}
		this.stopConnectionTimer()
		this.connectionTimer = undefined
	}

	async configUpdated(config) {
		this.config = config
		this.stopConnectionTimer()

		await this.initDevice()
		this.updateChoices()
		this.updateActions()
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'checkbox',
				id: 'shouldFilter',
				label: 'Hide disconnected',
				width: 8,
				tooltip: "Hide Panels and Breakers in action choices that aren't physically connected.",
				default: true,
			},
			{
				id: 'panelMax',
				type: 'number',
				label: 'Max Panels',
				width: 8,
				isVisible: (options) => options.supportsManualAdjustments,
				default: 8,
			},
			{
				id: 'breakerMax',
				type: 'number',
				label: 'Max Number of Breakers in a Panel',
				width: 8,
				isVisible: (options) => options.supportsManualAdjustments,
				default: 42,
			},
		]
	}

	updateChoices() {
		this.CHOICES_PANELS = UpdateChoices.getPanelChoices(this)
		this.CHOICES_BREAKERS = [...Array(this.config.panelMax)].map((each, index) =>
			UpdateChoices.getBreakerChoicesbyPanel(this, index)
		)
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)

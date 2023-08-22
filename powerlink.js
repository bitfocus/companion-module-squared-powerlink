const modbus = require('modbus-stream')
const util = require('util')
const { transcode } = require('node:buffer')
const connect = util.promisify(modbus.tcp.connect)

class Powerlink {
	constructor(host) {
		this.host = host
		this.port = 502
		this.connection = undefined
		this.maxZones = 64
		this.maxBreakers = 336
		this.maxBreakersOnPanel = 42
		this.maxInputs = 256
		this.maxPanels = 8
		this.maxSchedules = 64
		this.maxTerminals = 0
		this.maxBuses = 16
		this.maxBreakersOnBus = 21
	}

	async init() {
		try {
			this.connection = await connect(this.port, this.host, {})
		} catch (error) {
			if (error.message === 'GatewayPathUnavailable') {
				throw new Error(`Unable to connect to ${this.host}:${this.port}: ${error.message}`)
			}
			console.error(error);
			this.connection = undefined
		}
	}

	close() {
		if (this.connection) {
			this.connection.close()
			this.connection = undefined
		}
	}

	calculateAddress(baseAddress, bus, breaker, busOffset) {
		// for some reason the number is off by 1 more than the spec says
		const discreteInputAddress = baseAddress + bus * busOffset
		return discreteInputAddress - 2 + breaker
	}

	calculateZoneAddress(baseAddress, zone) {
		// for some reason the number is off by 1 more than the spec says
		return baseAddress - 2 + zone
	}

	calculateBusAddress(baseAddress, bus) {
		return baseAddress - 1 + bus
	}

	// bus goes from 0-15
	// Breaker goes from 1-21
	async getBreakerInfoByBus(bus, breaker, quantity = 1, info = []) {
		const fileOffset = 24
		const discreteInputOffset = 32
		const holdingRegistersOffset = 24
		const configurationRegistersOffset = 48

		if (breaker < 1 || breaker > this.maxBreakersOnBus) {
			throw 'Invalid Breaker Number'
		}

		if (bus < 0 || bus > 15) {
			throw 'Invalid Bus Number'
		}

		quantity = this.clamp(quantity, 0, this.maxBreakersOnBus - breaker + 1)

		let returnInfo = Array.from({ length: quantity }, (each) => ({}))
		const returnAll = !info.length

		const getAndReturnInfo = async (feature) => {
			if (returnAll || info.includes(feature.name)) {
				await this.readFeatureObject(feature)
			}
		}

		await getAndReturnInfo({
			name: 'id',
			quantity,
			returnFunction: (name, info) => {
				for (let index = 0; index < quantity; index++) {
					returnInfo[index][name] = breaker + index
				}
			},
		})

		await getAndReturnInfo({
			name: 'busNumber',
			quantity,
			returnFunction: (name, info) => {
				const isBusLeft = !(bus % 2)
				let busNumber
				if (isBusLeft) {
					busNumber = Math.ceil(bus / 2) + 'L'
				} else {
					busNumber = Math.ceil(bus / 2) - 1 + 'R'
				}

				for (let index = 0; index < quantity; index++) {
					returnInfo[index][name] = busNumber
				}
			},
		})

		const storeCoilInfo = (name, info, trueText = 'ON', falseText = 'OFF') => {
			info.forEach((element, index) => {
				returnInfo[index][name] = element
				returnInfo[index][`${name}Text`] = element ? trueText : falseText
			})
		}

		await getAndReturnInfo({
			name: 'directBreakerControl',
			address: this.calculateAddress(3000, bus, breaker, discreteInputOffset),
			quantity,
			readFunction: this.readCoilsNormal,
			returnFunction: storeCoilInfo,
		})

		if (returnAll || info.includes('state')) {
			// Inputs
			const breakerState = {
				actual: 0,
				actualText: 'OFF',
				control: 0,
				controlText: 'OFF',
				desired: 0,
				desiredText: 'OFF',
			}

			for (let index = 0; index < quantity; index++) {
				returnInfo[index].state = { ...breakerState }
			}

			const stateHelper = (name, info) => {
				info.forEach((element, i) => {
					returnInfo[i].state[name] = element
					returnInfo[i].state[`${name}Text`] = element ? 'ON' : 'OFF'
				})
			}

			await this.readFeatureObject({
				name: 'actual',
				address: this.calculateAddress(3000, bus, breaker, discreteInputOffset),
				quantity,
				readFunction: this.readDiscreteInputs,
				returnFunction: stateHelper,
			})

			await this.readFeatureObject({
				name: 'control',
				address: this.calculateAddress(3512, bus, breaker, discreteInputOffset),
				quantity,
				readFunction: this.readDiscreteInputs,
				returnFunction: stateHelper,
			})

			await this.readFeatureObject({
				name: 'desired',
				address: this.calculateAddress(5048, bus, breaker, discreteInputOffset),
				quantity,
				readFunction: this.readDiscreteInputs,
				returnFunction: stateHelper,
			})

		}

		await getAndReturnInfo({
			name: 'present',
			address: this.calculateAddress(5560, bus, breaker, discreteInputOffset),
			quantity,
			readFunction: this.readDiscreteInputs,
			returnFunction: (name, info) => storeCoilInfo(name, info, 'Present', 'Absent'),
		})

		await getAndReturnInfo({
			name: 'notResponding',
			address: this.calculateAddress(6072, bus, breaker, discreteInputOffset),
			quantity,
			readFunction: this.readDiscreteInputs,
			returnFunction: (name, info) => storeCoilInfo(name, info, 'Not Responding', 'Normal'),
		})

		await getAndReturnInfo({
			name: 'blinkTimerValue',
			address: this.calculateAddress(2000, bus, breaker, holdingRegistersOffset),
			quantity,
			readFunction: this.readInputRegisters,
			process: (data) => data.map((element) => element.readUIntBE(0, 2)),
			returnFunction: (name, info) => {
				info.forEach((element, i) => {
					returnInfo[i][name] = element
					returnInfo[i][`${name}MS`] = `${Math.floor(element / 60)}:${element % 60}`
				})
			},
		})

		await getAndReturnInfo({
			name: 'type',
			address: this.calculateAddress(2384, bus, breaker, holdingRegistersOffset),
			quantity,
			readFunction: this.readInputRegisters,
			process: (data) => data.map((element) => element.readUInt16BE(0)),
			returnFunction: (name, info) => {
				info.forEach((breakerType, i) => {
					let breakerTypeText

					if (breakerType === 0) {
						breakerTypeText = 'No Breaker Installed'
					} else if (breakerType === 1 || breakerType === 2 || breakerType === 3) {
						breakerTypeText = `${breakerType} pole`
					}
					returnInfo[i][name] = breakerType
					returnInfo[i][`${name}Text`] = breakerTypeText
				})
			},
		})

		//Configuration Registers
		await getAndReturnInfo({
			name: 'onTime',
			address: this.calculateAddress(2001, bus, breaker, configurationRegistersOffset),
			quantity,
			readFunction: (address, quantity) => this.readHoldingRegisters(address, 2 * quantity),
			process: (data) => {
				const buf = Buffer.concat(data, quantity * 4)
				return this.flipLowerAddress(buf)
			},
			returnFunction: (name, info) => {
				for (let i = 0; i < quantity; i++) {
					const value = info.readUInt32BE(i * 4)
					returnInfo[i][name] = value
					returnInfo[i][`${name}HM`] = `${Math.floor(value / 60)}:${value % 60}`
				}
			},
		})

		// this hasn't been verified with hardware
		await getAndReturnInfo({
			name: 'blinkType',
			address: this.calculateAddress(3101, bus, breaker, 24),
			quantity,
			readFunction: this.readHoldingRegisters,
			process: (data) => data.map((element) => element.readUInt16BE(0)),
			returnFunction: (name, info) => {
				info.forEach((value, i) => {
					const enumeration = {
						0: 'No Blink',
						1: 'Single Blink',
						2: 'Double Blink (Single with additional 1 minute warning blink)',
						3: 'Delay with No Blink (Use with HID lights)',
						4: 'Pulse OFF (Use with sweep switches)',
						5: 'Pulse OFF w/ Repeat',
					}
					returnInfo[i][name] = value
					returnInfo[i][`${name}Text`] = enumeration?.[value] ?? ''
				})
			},
		})

		await getAndReturnInfo({
			name: 'strikeCount',
			address: this.calculateAddress(7001, bus, breaker, configurationRegistersOffset),
			quantity,
			readFunction: (address, quantity) => this.readHoldingRegisters(address, quantity * 2),
			process: (data) => {
				const buf = Buffer.concat(data, quantity * 4)
				return this.flipLowerAddress(buf)
			},
			returnFunction: (name, info) => {
				for (let i = 0; i < quantity; i++) {
					returnInfo[i][name] = info.readUInt32BE(i * 4)
				}
			},
		})

		const file = 5
		await getAndReturnInfo({
			name: 'nameTag',
			address: this.calculateAddress(1, bus, breaker + 1, fileOffset),
			quantity,
			readFunction: (address, quantity) => this.readFiles(file, address, quantity),
			returnFunction: (name, info) => {
				info.forEach((element, i) => {
					returnInfo[i][name] = element
				})
			},
		})

		return returnInfo
	}

	async setBreakerInfoByBus(bus, breaker, info) {
		const fileOffset = 24
		const discreteInputOffset = 32
		const holdingRegistersOffset = 24
		const configurationRegistersOffset = 48

		if (breaker < 1 || breaker > this.maxBreakersOnBus) {
			throw 'Invalid Breaker Number'
		}

		if (bus < 0 || bus > this.maxBuses - 1) {
			throw 'Invalid Bus Number'
		}

		if (!info.length) {
			return
		}

		// depending on the breaker number, make sure that nothing goes over 42
		if (info.length > this.maxBreakersOnBus - breaker + 1) {
			info = info.slice(0, this.maxBreakersOnBus - breaker + 1)
		}

		const writtenData = []
		const errors = []

		const writeAndLogFeature = async (feature) => {
			try {
				const result = await this.writeFeatureObject(feature)
				if (result !== undefined) {
					writtenData.push(feature.name)
				}
			} catch (error) {
				errors.push(feature.name)
				console.error(error)
			}
		}

		await this.startWrite()

		await writeAndLogFeature({
			name: 'directBreakerControl',
			address: this.calculateAddress(3000, bus, breaker, discreteInputOffset),
			data: info,
			writeFunction: this.writeCoils,
		})

		// This can only reset the value back to 0
		await writeAndLogFeature({
			name: 'onTime',
			address: this.calculateAddress(2001, bus, breaker, configurationRegistersOffset),
			data: info,
			process: () => Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			writeFunction: this.writeRegisters,
		})

		await writeAndLogFeature({
			name: 'blinkType',
			address: this.calculateAddress(3101, bus, breaker, holdingRegistersOffset),
			data: info,
			process: (each) => {
				const buf = Buffer.allocUnsafe(2)
				switch (each) {
					case 0:
					case 1:
					case 2:
					case 3:
					case 4:
					case 5:
						buf.writeInt16BE(each, 0)
						return buf

					default:
						buf.writeInt16BE(0, 0)
						return buf
				}
			},
			writeFunction: this.writeRegisters,
		})

		// This can only reset the value back to 0
		await writeAndLogFeature({
			name: 'strikeCount',
			address: this.calculateAddress(7001, bus, breaker, configurationRegistersOffset),
			data: info,
			process: () => Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			writeFunction: this.writeRegisters,
		})

		const file = 5
		await writeAndLogFeature({
			name: 'nameTag',
			address: this.calculateAddress(1, bus, breaker + 1, fileOffset),
			data: info,
			writeFunction: (address, data) => this.writeFiles(file, address, data),
		})

		await this.endWrite()
		return writtenData
	}

	// Panel goes from 0-7
	// Breaker goes from 0-41
	// Breaker goes from 1-42
	// fix the id of each breaker to be based on panel
	async getBreakerInfoByPanel(panel, breaker, quantity = 1, info = []) {
		// which side is the breaker on
		const isBreakerOnLeft = breaker % 2
		let busOffset = panel * 2

		const breakerOffset = Math.ceil(breaker / 2)

		if (quantity === 1) {
			let idFix = -1
			if (!isBreakerOnLeft) {
				busOffset++
				idFix = 0
			}
			return (await this.getBreakerInfoByBus(busOffset, breakerOffset, quantity, info)).map((each, index) => {
				if (each.id !== undefined) {
					each.id = (breakerOffset + index) * 2 + idFix
				}
				return each
			})
		} else {
			let left, right, shuffled
			if (isBreakerOnLeft) {
				left = await this.getBreakerInfoByBus(busOffset, breakerOffset, Math.ceil(quantity / 2), info)
				right = await this.getBreakerInfoByBus(busOffset + 1, breakerOffset, Math.floor(quantity / 2), info)
				return this.shuffle(left, right, quantity).map((each, index) => {
					if ('id' in each) {
						each.id = breakerOffset + index
					}
					return each
				})
			} else {
				right = await this.getBreakerInfoByBus(busOffset + 1, breakerOffset, Math.ceil(quantity / 2), info)

				left = await this.getBreakerInfoByBus(busOffset, breakerOffset, Math.floor(quantity / 2), info)

				return this.shuffle(right, left, quantity).map((each, index) => {
					if ('id' in each) {
						each.id = breakerOffset + index + 1
					}
					return each
				})
			}
		}
	}

	async setBreakerInfoByPanel(panel, breaker, info = []) {
		// which side is the breaker on
		const isBreakerOnLeft = breaker % 2
		let busOffset = panel * 2

		const breakerOffset = Math.ceil(breaker / 2)
		const quantity = info.length

		if (quantity === 1) {
			if (!isBreakerOnLeft) {
				busOffset++
			}
			return this.setBreakerInfoByBus(busOffset, breakerOffset, info)
		} else {
			let left, right
			const splitInfo = this.separate(info)

			if (isBreakerOnLeft) {
				left = await this.setBreakerInfoByBus(busOffset, breakerOffset, splitInfo[0])

				right = await this.setBreakerInfoByBus(busOffset + 1, breakerOffset, splitInfo[1])

				return this.shuffle(left, right, right.length + left.length)
			} else {
				right = await this.setBreakerInfoByBus(busOffset + 1, breakerOffset, splitInfo[0])

				left = await this.setBreakerInfoByBus(busOffset, breakerOffset, splitInfo[1])

				return this.shuffle(right, left, right.length + left.length)
			}
		}
	}

	separate(array) {
		if (!Array.isArray(array)) {
			throw 'Invalid Input: Array input is required'
		}

		const array1 = array.filter((element, index) => index % 2 === 0)
		const array2 = array.filter((element, index) => index % 2 !== 0)
		return [array1, array2]
	}

	shuffle(array1, array2, length) {
		const array3 = []

		if (!Array.isArray(array1) || !Array.isArray(array2)) {
			throw 'Invalid Input: Array input is required'
		}

		for (let i = 0; i < length; i++) {
			if (i % 2 === 0) {
				array3[i] = array1[i / 2]
			} else {
				array3[i] = array2[(i - 1) / 2]
			}
		}

		return array3
	}

	// Bus number starts at 0 and goes to 15
	async getBusInfo(bus, quantity = 1, info = []) {
		if (bus < 0 || bus > this.maxBuses - 1) {
			throw 'Invalid Bus Number'
		}

		quantity = this.clamp(quantity, 0, this.maxBuses - bus)

		let returnInfo = Array.from({ length: quantity }, (each) => ({}))
		const returnAll = !info.length

		const getAndReturnInfo = async (feature) => {
			if (returnAll || info.includes(feature.name)) {
				await this.readFeatureObject(feature)
			}
		}
		const storeCoilInfo = (name, info, trueText = 'ON', falseText = 'OFF') => {
			info.forEach((element, index) => {
				returnInfo[index][name] = element
				returnInfo[index][`${name}Text`] = element ? trueText : falseText
			})
		}

		await getAndReturnInfo({
			name: 'busNumber',
			quantity,
			returnFunction: (name, info) => {
				for (let index = 0; index < quantity; index++) {
					const thisBus = bus + index
					const isBusLeft = !(thisBus % 2)
					let busNumber
					if (isBusLeft) {
						busNumber = Math.ceil(thisBus / 2) + 'L'
					} else {
						busNumber = Math.ceil(thisBus / 2) - 1 + 'R'
					}
					returnInfo[index][name] = busNumber
				}
			},
		})

		await getAndReturnInfo({
			name: 'id',
			quantity,
			returnFunction: (name, info) => {
				for (let index = 0; index < quantity; index++) {
					const thisBus = bus + index
					returnInfo[index][name] = thisBus
				}
			},
		})

		await getAndReturnInfo({
			name: 'present',
			address: this.calculateBusAddress(2500, bus),
			quantity,
			readFunction: this.readDiscreteInputs,
			returnFunction: (name, info) => storeCoilInfo(name, info, 'Present', 'Absent'),
		})

		await getAndReturnInfo({
			name: 'hasNotRespondingBreaker',
			address: this.calculateBusAddress(9964, bus),
			quantity,
			readFunction: this.readDiscreteInputs,
			returnFunction: (name, info) => storeCoilInfo(name, info, 'Not Responding', 'Normal'),
		})

		await getAndReturnInfo({
			name: 'numberingSequence',
			address: this.calculateBusAddress(3001, bus),
			quantity,
			readFunction: this.readHoldingRegisters,
			returnFunction: (name, info) => {
				const enumeration = {
					0: "Increment by 2's",
					1: "Increment by 1's",
					2: "Decrement by 2's",
					3: "Decrement by 1's",
				}
				info.forEach((element, i) => {
					const value = element.readUInt8(0)
					const firstBreakerNumber = element.readUInt8(1)
					returnInfo[i][name] = {
						sequence: value,
						sequenceText: enumeration?.[value] ?? '',
						firstBreakerNumber,
					}
				})
			},
		})

		const file = 6
		await getAndReturnInfo({
			name: 'nameTag',
			address: this.calculateBusAddress(1 + 1, bus),
			quantity,
			readFunction: (address, quantity) => this.readFiles(file, address, quantity),
			returnFunction: (name, info) => {
				info.forEach((element, i) => {
					returnInfo[i][name] = element
				})
			},
		})

		return returnInfo
	}

	// Panel number starts at 0 and goes to 7
	// return {
	//	name: panelName,
	// busL: leftBus,
	// busR: rightBus,
	//}
	async getPanelInfo(panel, quantity = 1, info = []) {
		if (panel < 0 || panel > this.maxPanels - 1) {
			throw 'Invalid Panel Number'
		}
		quantity = this.clamp(quantity, 0, this.maxPanels - panel)

		let returnInfo = Array.from({ length: quantity }, (each, index) => ({
			name: '',
			id: index,
			busL: undefined,
			busR: undefined,
		}))

		const bus = panel * 2

		const busInfo = await this.getBusInfo(bus, quantity * 2, info)

		for (let index = 0; index < quantity; index++) {
			returnInfo[index] = {
				nameTag: busInfo[index * 2].nameTag,
				id: index + panel,
				busL: busInfo[index * 2],
				busR: busInfo[index * 2 + 1],
			}
		}
		return returnInfo
	}

	writeFeature(name, start, zone, data, process, writeFunction) {
		if (name in data[0]) {
			const info = data.map((each) => each[name])

			const address = this.calculateZoneAddress(start, zone)
			// process each item
			const processed = info.map((each) => process(each))

			return writeFunction(address, processed)
		}
	}

	writeFeatureObject({ name, address, data, process, writeFunction = this.writeCoils } = {}) {
		if (name in data?.[0]) {
			const info = process ? data.map((each) => process(each[name])) : data.map((each) => each[name])
			return writeFunction.call(this, address, info)
		}
	}

	async readFeatureObject({ name, address, quantity, process, readFunction = this.readCoils, returnFunction } = {}) {
		// get the data
		let result
		if (address !== undefined) {
			result = await readFunction.call(this, address, quantity)
		}

		// process the data
		if (process !== undefined) {
			result = process(result)
		}

		// const returnArray = []

		// return function
		// for (let index = 0; index < quantity; index++) {
		// 	returnArray[index][name] = rawValue
		// 	returnArray[index][`${name}Text`] = stringValue
		// }
		return returnFunction(name, result)
	}

	getDescriptionFromAddress(address) {
		const first = Math.floor(address / 100)
		if (first === 100) {
			// input
			return `Input ${address - 10000}`
		} else if (first === 120) {
			// zone
			return `Zone ${address - 12000 + 1}`
		} else if (first === 40) {
			// remote
			return `Remote ${address - 4000 + 1}`
		} else if (first === 105) {
			// Schedule state
			return `Schedule ${address - 10500 + 1}`
		} else if (first === 130) {
			// Schedule state
			return `Breaker ${address - 13000 + 1}`
		}
		return ''
	}

	bitMap(bytes) {
		const bits = []
		for (let index = 0; index < 16; index++) {
			bits.push(Math.floor(bytes / 2 ** index) % 2)
		}
		return bits.reverse()
	}

	byteToBits(byte) {
		const bits = []
		for (let index = 0; index < 8; index++) {
			bits.push(Math.floor(byte / 2 ** index) % 2)
		}
		return bits.reverse()
	}

	bitsToUInt16BE(bits) {
		const number = parseInt(bits.join(''), 2)
		const buf = Buffer.alloc(2)
		buf.writeUInt16BE(number)
		return buf
	}

	bitsToRegisters(bits) {
		// split into 32 length segments
		const segmentsLength = 32
		const buffLength = segmentsLength / 8
		const length = bits.length / segmentsLength
		const returnBuffers = []

		for (let index = 0; index < length; index++) {
			const element = bits.slice(index * segmentsLength, index * segmentsLength + segmentsLength).reverse()
			const number = parseInt(element.join(''), 2)
			const buf = Buffer.alloc(buffLength)
			buf.writeUInt32BE(number)
			returnBuffers.push(buf)
		}
		return Buffer.concat(returnBuffers)
	}

	bitExtracted(number, numberOfBits, positionFromRight) {
		return ((1 << numberOfBits) - 1) & (number >> positionFromRight)
	}

	flipLowerAddress(buffer) {
		// shuffle every other element
		return buffer.swap16().swap32()
	}

	// 0xxxx
	readCoils(options) {
		return new Promise((resolve, reject) => {
			this.connection.readCoils(options, (err, res) => {
				if (err) reject(err)
				// if (options.quantity > 1) {
				resolve(res.response.data?.slice(0, options.quantity))
				// }
				// resolve(res.response.data?.[0])
			})
		})
	}

	readCoilsNormal(address, quantity = 1) {
		return this.readCoils.call(this, { address, quantity })
	}

	writeCoils(address, values) {
		return new Promise((resolve, reject) => {
			// process all the values to make sure they are 1 or 0
			const processedValues = values.map((each) => (each ? 1 : 0))

			this.connection.writeMultipleCoils(
				{
					address,
					values: processedValues,
				},
				(err, res) => {
					if (err) reject(err)
					resolve(res)
				}
			)
		})
	}

	// 3xxxx
	readInputRegisters(address, quantity = 1) {
		return new Promise((resolve, reject) => {
			this.connection.readInputRegisters(
				{
					address,
					quantity,
				},
				(err, res) => {
					if (err) reject(err)
					if (res.response?.exception) reject(res.response.exception)
					resolve(res.response.data?.slice(0, quantity))
				}
			)
		})
	}

	// 4xxxx
	readHoldingRegisters(address, quantity = 1) {
		return new Promise((resolve, reject) => {
			this.connection.readHoldingRegisters(
				{
					address,
					quantity,
				},
				(err, res) => {
					if (err) reject(err)
					if (res.response?.exception) reject(res.response.exception)
					resolve(res.response.data?.slice(0, quantity))
				}
			)
		})
	}

	writeRegisters(address, values) {
		return new Promise((resolve, reject) => {
			//Process all the values to make sure they are only 2 bytes long
			const processedValues = values
				.map((each) => {
					if (each.length > 2) {
						// Split the buffer into 2-byte chunks
						const chunks = []
						for (let i = 0; i < length; i += 2) {
							chunks.push(value.slice(i, i + 2))
						}
						return chunks
					}
					return each
				})
				.flat()
			this.connection.writeMultipleRegisters(
				{
					address,
					processedValues,
				},
				(err, res) => {
					if (err) reject(err)
					resolve(res)
				}
			)
		})
	}

	// 1xxxx
	readDiscreteInputs(address, quantity = 1) {
		return new Promise((resolve, reject) => {
			this.connection.readDiscreteInputs(
				{
					address,
					quantity,
				},
				(err, res) => {
					if (err) reject(err)
					if (res.response?.exception) reject(res.response.exception)
					resolve(res.response.data?.slice(0, quantity))
				}
			)
		})
	}

	async readFiles(file, address, quantity = 1, length = 16, raw = false, chunkSize = 8) {
		const chunks = []

		const requests = []
		for (let index = 0; index < quantity; index++) {
			requests.push({
				file,
				address: address + index,
				length,
			})
		}

		// split the requests up into chunks
		for (let i = 0; i < quantity; i += chunkSize) {
			const chunk = requests.slice(i, i + chunkSize)
			chunks.push(await this.readXFiles(chunk, raw))
		}

		return chunks.flat()
	}

	readXFiles(requests, raw) {
		return new Promise((resolve, reject) => {
			this.connection.readFileRecord({ requests }, (err, res) => {
				if (err) reject(err)
				if (res.response?.exception !== undefined) {
					const exception = new Error(res.response.exception)
					reject(exception)
					return false
				}

				const result = res.response.data?.splice(0, requests.length)

				let returnResult = result.map((each) => Buffer.concat(each))

				if (raw) {
					resolve(returnResult)
				}

				returnResult = returnResult.map((each) => each.toString('ASCII').trim())

				resolve(returnResult)
			})
		})
	}

	async writeFiles(file, address, values, length = 16, raw = false, chunkSize = 8) {

		const chunks = []

		const convertedValues = values.map((item, index) => {
			//pad or truncate the text to the length
			let value = item
			if (!raw) {
				const paddedText = item.slice(0, length).padEnd(length, ' ')
				value = transcode(Buffer.from(paddedText, 'utf8'), 'utf8', 'ascii')
			}

			// Split the buffer into 2-byte chunks
			const chunks = []
			for (let i = 0; i < length; i += 2) {
				chunks.push(value.slice(i, i + 2))
			}
			return {
				file,
				address: address + index,
				values: chunks,
			}
		})

		// split the requests up into chunks
		for (let i = 0; i < values.length; i += chunkSize) {
			const chunk = convertedValues.slice(i, i + chunkSize)
			chunks.push(await this.writeXFiles(chunk))
		}

		return chunks.flat()
	}

	writeXFiles(requests) {
		return new Promise((resolve, reject) => {
			this.connection.writeFileRecord({ requests }, (err, res) => {
				if (err) reject(err)
				if (res.response?.exception !== undefined) {
					const exception = new Error(res.response.exception)
					reject(exception)
					return false
				}
				resolve(res.response?.data)
			})
		})
	}

	async startWrite() {
		const enableCommand = Buffer.from('2222', 'hex')
		const enableConfig = Buffer.from('EA60', 'hex')

		// 1. Enable Command Interface
		await new Promise((resolve, reject) => {
			this.connection.writeSingleRegister({ address: 8200, value: enableCommand, extra: {} }, (err, res) => {
				if (err) reject(err)
				resolve(res.response)
			})
		})

		// 2. Enable Configuration Mode
		await new Promise((resolve, reject) => {
			this.connection.writeSingleRegister({ address: 8020, value: enableConfig, extra: {} }, (err, res) => {
				if (err) reject(err)
				resolve(res.response)
			})
		})
	}

	async endWrite() {
		const verifySave = Buffer.from('EAC4', 'hex')
		const disableCommand = Buffer.from('0000', 'hex')

		// 3. Verify and Save
		await new Promise((resolve, reject) => {
			this.connection.writeSingleRegister({ address: 8020, value: verifySave, extra: {} }, (err, res) => {
				if (err) reject(err)
				resolve(res.response)
			})
		})

		// 4. Disable Command Interface
		await new Promise((resolve, reject) => {
			this.connection.writeSingleRegister({ address: 8200, value: disableCommand, extra: {} }, (err, res) => {
				if (err) reject(err)
				resolve(res.response)
			})
		})
	}

	clamp(value, min, max) {
		return Math.min(Math.max(value, min), max)
	}
}

module.exports = Powerlink

const modbus = require('modbus-stream')
const Powerlink = require('../powerlink')

// jest.mock('modbus-stream');

jest.mock('modbus-stream', () => {
	const original = jest.requireActual('modbus-stream')
	return {
		...original,
		tcp: {
			connect: jest.fn((a, b, c, callback) =>
				callback(null, {
					readFileRecord: jest.fn((options, callback) => {
						// Simulate a successful response from the Modbus library
						const response = {
							response: {
								data: [[Buffer.from('Hello'), Buffer.from('World')]], // Replace with your desired response data
							},
						}
						callback(null, response)
					}),
					writeFileRecord: jest.fn((options, callback) => {
						// Simulate a successful response from the Modbus library
						const response = {
							response: {
								data: [[Buffer.from('Hello'), Buffer.from('World')]], // Replace with your desired response data
							},
						}
						callback(null, response)
					}),
					writeSingleRegister: jest.fn((options, callback) => {
						// Simulate a successful response from the Modbus library
						const response = {
							response: {
								data: [[Buffer.from('Hello'), Buffer.from('World')]], // Replace with your desired response data
							},
						}
						callback(null, response)
					}),
				})
			),
		},
	}
})

describe('SetBreakerInfoByBus', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should throw an error for an invalid Breaker number', async () => {
		expect.assertions(2)
		try {
			await powerlink.setBreakerInfoByBus(0, 0, [])
		} catch (e) {
			expect(e).toMatch('Invalid Breaker Number')
		}

		try {
			await powerlink.setBreakerInfoByBus(0, 22, [])
		} catch (e) {
			expect(e).toMatch('Invalid Breaker Number')
		}
	})

	it('should throw an error for an invalid bus number', async () => {
		expect.assertions(2)
		try {
			await powerlink.setBreakerInfoByBus(-1, 1, [])
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}

		try {
			await powerlink.setBreakerInfoByBus(16, 21, [])
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}
	})

	it('should send the commands to start writing and end writing', async () => {
		const bus = 0
		const breaker = 1
		const info = [
			{
				directBreakerControl: 0,
			},
		]

		powerlink.writeCoils = jest.fn()

		powerlink.writeCoils.mockResolvedValueOnce()

		await powerlink.setBreakerInfoByBus(bus, breaker, info)

		expect(powerlink.connection.writeSingleRegister).toHaveBeenCalledWith(
			{ address: 8200, value: Buffer.from('2222', 'hex'), extra: {} },
			expect.any(Function)
		)

		expect(powerlink.connection.writeSingleRegister).toHaveBeenCalledWith(
			{ address: 8020, value: Buffer.from('EA60', 'hex'), extra: {} },
			expect.any(Function)
		)

		expect(powerlink.connection.writeSingleRegister).toHaveBeenCalledWith(
			{ address: 8020, value: Buffer.from('EAC4', 'hex'), extra: {} },
			expect.any(Function)
		)

		expect(powerlink.connection.writeSingleRegister).toHaveBeenCalledWith(
			{ address: 8200, value: Buffer.from('0000', 'hex'), extra: {} },
			expect.any(Function)
		)
	})

	it('should send directBreakerControl for breakers 20 and 21 but not anything over that', async () => {
		const breaker = 20
		const busNumber = 2
		const info = [
			{
				directBreakerControl: 0,
			},
			{
				directBreakerControl: 1,
			},
			{
				directBreakerControl: 1,
			},
		]

		powerlink.writeCoils = jest.fn()

		powerlink.writeCoils.mockResolvedValueOnce()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeCoils).toHaveBeenCalledWith(3082, [0, 1])
	})

	it('should send directBreakerControl for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
		]

		powerlink.writeCoils = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeCoils).toHaveBeenCalledWith(3064, [0])
	})
	it('should send directBreakerControl for mulitple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		]
		const values = [1, 0, 1]

		powerlink.writeCoils = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeCoils).toHaveBeenCalledWith(3064, values)
	})

	it('should send breaker onTime for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				onTime: 4294967295,
				onTimeHM: `${Math.floor(4294967295 / 60)}:${4294967295 % 60}`,
			},
		]
		const values = [Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex')]

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 2097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(firstAddress, values)
	})

	// it('should send breaker onTime for a single breaker and swapped', async () => {
	// 	const busNumber = 2
	// 	const breaker = 2
	// 	const info = [{
	// 		onTime: 16576762,
	// 		onTimeHM: `${Math.floor(16576762 / 60)}:${16576762 % 60}`,
	// 	}]
	// 	const values = [Buffer.from(['0xF0', '0xFA', '0x00', '0xFC'], 'hex'),]

	// 	//(Base Address – 1) + Breaker Position on Bus = Address
	// 	//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
	// 	//(13000 – 1) + 3 = 13002

	// 	const baseAddress = 2097
	// 	const breakerPositionOnBus = 2
	// 	const firstAddress = baseAddress - 2 + breakerPositionOnBus

	// 	powerlink.writeRegisters = jest.fn()

	// 	await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

	// 	expect(powerlink.writeRegisters).toHaveBeenCalledWith(firstAddress, values)
	// })

	it('should send breaker onTime for mulitple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				onTime: 4294967295,
				onTimeHM: `${Math.floor(4294967295 / 60)}:${4294967295 % 60}`,
			},
			{
				onTime: 0,
				onTimeHM: `${Math.floor(0 / 60)}:${0 % 60}`,
			},
			{
				onTime: 16576762,
				onTimeHM: `${Math.floor(16576762 / 60)}:${16576762 % 60}`,
			},
		]
		const values = [
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
		]

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(2097, values)
	})

	it('should send breaker blinkType for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				blinkType: 0,
				blinkTypeText: 'No Blink',
			},
		]
		const values = [Buffer.from(['0x00', '0x00'], 'hex')]

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 3149
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(firstAddress, values)
	})

	it('should send breaker blinkType for mulitple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				blinkType: 0,
				blinkTypeText: 'No Blink',
			},
			{
				blinkType: 1,
				blinkTypeText: 'Single Blink',
			},
			{
				blinkType: 2,
				blinkTypeText: 'Double Blink (Single with additional 1 minute warning blink)',
			},
			{
				blinkType: 3,
				blinkTypeText: 'Delay with No Blink (Use with HID lights)',
			},
			{
				blinkType: 4,
				blinkTypeText: 'Pulse OFF (Use with sweep switches)',
			},
			{
				blinkType: 5,
				blinkTypeText: 'Pulse OFF w/ Repeat',
			},
		]
		const values = [
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x01'], 'hex'),
			Buffer.from(['0x00', '0x02'], 'hex'),
			Buffer.from(['0x00', '0x03'], 'hex'),
			Buffer.from(['0x00', '0x04'], 'hex'),
			Buffer.from(['0x00', '0x05'], 'hex'),
		]

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(3149, values)
	})

	it('should reset breaker strikeCount for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				strikeCount: 4294967295,
			},
		]
		const values = [
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			// Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
		]

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 7097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(firstAddress, values)
	})

	// it('should reset breaker strikeCount for a single breaker with swapped values', async () => {
	// 	const busNumber = 2
	// 	const breaker = 2
	// 	const info = [{
	// 		strikeCount: 16576762,
	// 	}]
	// 	const values = [Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex')]

	// 	//(Base Address – 1) + Breaker Position on Bus = Address
	// 	//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
	// 	//(13000 – 1) + 3 = 13002

	// 	const baseAddress = 7097
	// 	const breakerPositionOnBus = 2
	// 	const firstAddress = baseAddress - 2 + breakerPositionOnBus

	// 	powerlink.writeRegisters = jest.fn()

	// 	await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

	// 	expect(powerlink.writeRegisters).toHaveBeenCalledWith(firstAddress, values)
	// })

	it('should reset breaker strikeCount for mulitple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				strikeCount: 4294967295,
			},
			{
				strikeCount: 0,
			},
			{
				strikeCount: 4294967295,
			},
		]
		const values = [
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00', '0x00', '0x00'], 'hex'),
		]

		powerlink.writeRegisters = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeRegisters).toHaveBeenCalledWith(7097, values)
	})

	it('should send breaker nameTag for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				nameTag: 'This is a test',
			},
		]
		const values = ['This is a test']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 49
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 1 + breakerPositionOnBus

		powerlink.writeFiles = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeFiles).toHaveBeenCalledWith(5, firstAddress, values)
	})

	it('should send breaker nameTag for mulitple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = [
			{
				nameTag: 'This is a test',
			},
			{
				nameTag: '',
			},
			{
				nameTag: 'Testing',
			},
		]
		const values = ['This is a test', '', 'Testing']

		powerlink.writeFiles = jest.fn()

		await powerlink.setBreakerInfoByBus(busNumber, breaker, info)

		expect(powerlink.writeFiles).toHaveBeenCalledWith(5, 50, values)
	})
})

describe('SetBreakerInfoByPanel', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should send directBreakerControl for a single breaker and check bus', async () => {
		const panel = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: false,
				directBreakerControlText: 'OFF',
			},
		]

		powerlink.setBreakerInfoByBus = jest.fn()

		powerlink.setBreakerInfoByBus.mockResolvedValueOnce([false])

		await powerlink.setBreakerInfoByPanel(panel, breaker, info)

		expect(powerlink.setBreakerInfoByBus).toHaveBeenCalledWith(5, 1, info)
	})

	it('should send directBreakerControl for a single breaker', async () => {
		const panel = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: false,
				directBreakerControlText: 'OFF',
			},
		]
		const values = [false]

		powerlink.writeCoils = jest.fn()

		powerlink.writeCoils.mockResolvedValueOnce()

		await powerlink.setBreakerInfoByPanel(panel, breaker, info)

		expect(powerlink.writeCoils).toHaveBeenCalledWith(3159, values)
	})

	it('should send directBreakerControl for mulitple breakers and check bus', async () => {
		const panel = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		]

		powerlink.setBreakerInfoByBus = jest.fn()

		powerlink.setBreakerInfoByBus.mockResolvedValueOnce([
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		])
		powerlink.setBreakerInfoByBus.mockResolvedValueOnce([
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
		])
		const result = await powerlink.setBreakerInfoByPanel(panel, breaker, info)

		// expect(powerlink.getBreakerInfoByBus).toHaveBeenCalled(2)
		expect(powerlink.setBreakerInfoByBus).toHaveBeenCalledWith(5, 1, [
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		])
		expect(powerlink.setBreakerInfoByBus).toHaveBeenCalledWith(4, 1, [
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
		])
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
	})

	it('should send directBreakerControl for mulitple breakers', async () => {
		const panel = 2
		const breaker = 2
		const info = [
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		]

		powerlink.writeCoils = jest.fn()

		await powerlink.setBreakerInfoByPanel(panel, breaker, info)

		expect(powerlink.writeCoils).toHaveBeenCalledWith(3159, [1, 1])
		expect(powerlink.writeCoils).toHaveBeenCalledWith(3127, [0])
	})
})

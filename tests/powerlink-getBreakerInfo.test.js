const Powerlink = require('../powerlink')

jest.mock('modbus-stream')

describe('getBreakerInfoByBus', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should throw an error for an invalid breaker number', async () => {
		expect.assertions(2)
		try {
			await powerlink.getBreakerInfoByBus(0, 0)
		} catch (e) {
			expect(e).toMatch('Invalid Breaker Number')
		}

		try {
			await powerlink.getBreakerInfoByBus(0, 43)
		} catch (e) {
			expect(e).toMatch('Invalid Breaker Number')
		}
	})

	it('should throw an error for an invalid panel number', async () => {
		expect.assertions(2)
		try {
			await powerlink.getBreakerInfoByBus(-1, 1)
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}

		try {
			await powerlink.getBreakerInfoByBus(16, 1)
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}
		// await expect(powerlink.getBreakerInfo(-1, 0)).rejects.toThrow('Invalid Panel Number')
		// await expect(powerlink.getBreakerInfo(8, 0)).rejects.toThrow('Invalid Panel Number')
	})

	it('should retrieve id for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['id']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(result).toEqual([
			{
				id: 2,
			},
		])
	})

	it('should retrieve id for a multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['id']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, 2, info)

		expect(result).toEqual([
			{
				id: 2,
			},
			{
				id: 3,
			},
		])

		const newResult = await powerlink.getBreakerInfoByBus(0, 1, 2, info)

		expect(newResult).toEqual([
			{
				id: 1,
			},
			{
				id: 2,
			},
		])

		const third = await powerlink.getBreakerInfoByBus(3, 1, 2, info)

		expect(third).toEqual([
			{
				id: 1,
			},
			{
				id: 2,
			},
		])
	})

	it('should retrieve busNumber for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '1L',
			},
		])
	})

	it('should retrieve busNumber for a single breaker with a higher bus number', async () => {
		const busNumber = 10
		const breaker = 2
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '5L',
			},
		])
	})

	it('should retrieve busNumber for a single breaker with a higher bus number on the right side', async () => {
		const busNumber = 11
		const breaker = 2
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '5R',
			},
		])
	})

	it('should retrieve busNumber for a multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, 2, info)

		expect(result).toEqual([
			{
				busNumber: '1L',
			},
			{
				busNumber: '1L',
			},
		])

		const newResult = await powerlink.getBreakerInfoByBus(0, 1, 2, info)

		expect(newResult).toEqual([
			{
				busNumber: '0L',
			},
			{
				busNumber: '0L',
			},
		])

		const third = await powerlink.getBreakerInfoByBus(3, 1, 2, info)

		expect(third).toEqual([
			{
				busNumber: '1R',
			},
			{
				busNumber: '1R',
			},
		])
	})

	it('should limit breaker quantity when over the amount of available breakers', async () => {
		const busNumber = 14
		const quantity = 3
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByBus(busNumber, 20, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '7L',
			},
			{
				busNumber: '7L',
			},
		])

		const newResult = await powerlink.getBreakerInfoByBus(15, 21, 3, info)

		expect(newResult).toEqual([
			{
				busNumber: '7R',
			},
		])
	})

	it('should retrieve directBreakerControl for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['directBreakerControl']

		powerlink.readCoils = jest.fn()

		powerlink.readCoils.mockResolvedValueOnce([false])
		// powerlink.readDiscreteInputs.mockResolvedValueOnce(true)
		// powerlink.readDiscreteInputs.mockResolvedValueOnce(false)
		// powerlink.readDiscreteInputs.mockResolvedValueOnce(true)
		// powerlink.readDiscreteInputs.mockResolvedValueOnce(false)
		// powerlink.readHoldingRegisters.mockResolvedValueOnce(Buffer.from([0, 0, 0, 200]))
		// powerlink.readInputRegisters.mockResolvedValueOnce(Buffer.from([0, 1]))
		// powerlink.readInputRegisters.mockResolvedValueOnce(Buffer.from([0, 2]))
		// powerlink.readInputRegisters.mockResolvedValueOnce(Buffer.from([0, 0, 0, 100]))
		// powerlink.readInputRegisters.mockResolvedValueOnce(Buffer.from([0, 2]))
		// powerlink.readInputRegisters.mockResolvedValueOnce(Buffer.from([0, 0, 0, 3]))
		// powerlink.readFiles.mockResolvedValueOnce(['Tag1', 'Tag2'])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readCoils).toHaveBeenCalledWith({
			address: 3064,
			quantity: 1,
		})
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(2)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3514)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5114)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5561)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(6073)
		// expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(2001, 2)
		// expect(powerlink.readInputRegisters).toHaveBeenCalledWith(3101)
		// expect(powerlink.readInputRegisters).toHaveBeenCalledWith(7001, 2)
		// expect(powerlink.readFiles).toHaveBeenCalledWith(5, 25, 1)
		// expect(powerlink.readFiles).toHaveBeenCalledWith(5, 25, 1)
		expect(result).toEqual([
			{
				directBreakerControl: false,
				directBreakerControlText: 'OFF',
			},
		])
	})
	it('should retrieve directBreakerControl for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['directBreakerControl']
		const quantity = 3

		powerlink.readCoils = jest.fn()

		powerlink.readCoils.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readCoils).toHaveBeenCalledWith({
			address: 3064,
			quantity: 3,
		})
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
		expect(result).toEqual([
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
		])
	})
	it('should retrieve breaker State for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['state']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 3064
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1])
		powerlink.readDiscreteInputs.mockResolvedValueOnce([0])
		powerlink.readDiscreteInputs.mockResolvedValueOnce([1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 1)
		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3576, 1)
		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5112, 1)
		expect(result).toEqual([
			{
				state: {
					actual: 1,
					actualText: 'ON',
					control: 0,
					controlText: 'OFF',
					desired: 1,
					desiredText: 'ON',
				},
			},
		])
	})

	it('should retrieve breaker State for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['state']
		const quantity = 3

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs
			.mockResolvedValueOnce([1, 0, 1])
			.mockResolvedValueOnce([0, 1, 0])
			.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3161, 1)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 1)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 1)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3064, 3)
		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3576, 3)
		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5112, 3)
		expect(result).toEqual([
			{
				state: {
					actual: 1,
					actualText: 'ON',
					control: 0,
					controlText: 'OFF',
					desired: 1,
					desiredText: 'ON',
				},
			},
			{
				state: {
					actual: 0,
					actualText: 'OFF',
					control: 1,
					controlText: 'ON',
					desired: 0,
					desiredText: 'OFF',
				},
			},
			{
				state: {
					actual: 1,
					actualText: 'ON',
					control: 0,
					controlText: 'OFF',
					desired: 1,
					desiredText: 'ON',
				},
			},
		])
	})

	it('should retrieve breaker present for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['present']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 5624
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				present: 1,
				presentText: 'Present',
			},
		])
	})

	it('should retrieve breaker present for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['present']
		const quantity = 3

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5624, 3)
		expect(result).toEqual([
			{
				present: 1,
				presentText: 'Present',
			},
			{
				present: 0,
				presentText: 'Absent',
			},
			{
				present: 1,
				presentText: 'Present',
			},
		])
	})

	it('should retrieve breaker notResponding for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['notResponding']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 6136
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				notResponding: 1,
				notRespondingText: 'Not Responding',
			},
		])
	})

	it('should retrieve breaker notResponding for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['notResponding']
		const quantity = 3

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(6136, 3)
		expect(result).toEqual([
			{
				notResponding: 1,
				notRespondingText: 'Not Responding',
			},
			{
				notResponding: 0,
				notRespondingText: 'Normal',
			},
			{
				notResponding: 1,
				notRespondingText: 'Not Responding',
			},
		])
	})

	it('should retrieve breaker blinkTimerValue for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['blinkTimerValue']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 2048
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readInputRegisters = jest.fn()

		powerlink.readInputRegisters.mockResolvedValueOnce([Buffer.from(['0xFF', '0xFF'], 'hex')])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readInputRegisters).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				blinkTimerValue: 65535,
				blinkTimerValueMS: '1092:15',
			},
		])
	})

	it('should retrieve breaker blinkTimerValue for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['blinkTimerValue']
		const quantity = 3

		powerlink.readInputRegisters = jest.fn()

		powerlink.readInputRegisters.mockResolvedValueOnce([
			Buffer.from(['0xFF', '0xFF']),
			Buffer.from(['0x00', '0x01']),
			Buffer.from(['0xFF', '0xFF'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readInputRegisters).toHaveBeenCalledWith(2048, 3)
		expect(result).toEqual([
			{
				blinkTimerValue: 65535,
				blinkTimerValueMS: '1092:15',
			},
			{
				blinkTimerValue: 1,
				blinkTimerValueMS: '0:1',
			},
			{
				blinkTimerValue: 65535,
				blinkTimerValueMS: '1092:15',
			},
		])
	})

	it('should retrieve breaker type for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['type']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 2432
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readInputRegisters = jest.fn()

		powerlink.readInputRegisters.mockResolvedValueOnce([Buffer.from(['0x00', '0x00'], 'hex')])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readInputRegisters).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				typeText: 'No Breaker Installed',
				type: 0,
			},
		])
	})

	it('should retrieve breaker type for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['type']
		const quantity = 4

		powerlink.readInputRegisters = jest.fn()

		powerlink.readInputRegisters.mockResolvedValueOnce([
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x01'], 'hex'),
			Buffer.from(['0x00', '0x02'], 'hex'),
			Buffer.from(['0x00', '0x03'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readInputRegisters).toHaveBeenCalledWith(2432, 4)
		expect(result).toEqual([
			{
				typeText: 'No Breaker Installed',
				type: 0,
			},
			{
				typeText: '1 pole',
				type: 1,
			},
			{
				typeText: '2 pole',
				type: 2,
			},
			{
				typeText: '3 pole',
				type: 3,
			},
		])
	})

	it('should retrieve breaker onTime for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['onTime']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 2097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 2)
		expect(result).toEqual([
			{
				onTime: 4294967295,
				onTimeHM: `${Math.floor(4294967295 / 60)}:${4294967295 % 60}`,
			},
		])
	})

	it('should retrieve breaker onTime for a single breaker and swapped', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['onTime']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 2097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0xF0', '0xFA'], 'hex'),
			Buffer.from(['0x00', '0xFC'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 2)
		expect(result).toEqual([
			{
				onTime: 16576762,
				onTimeHM: `${Math.floor(16576762 / 60)}:${16576762 % 60}`,
			},
		])
	})

	it('should retrieve breaker onTime for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['onTime']
		const quantity = 3

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(12)
		buf.writeUInt32BE(4294967295, 0)
		buf.writeUInt32BE(0, 4)
		buf.writeUInt32BE(4294967295, 8)
		// powerlink.readHoldingRegisters.mockResolvedValueOnce([buf])
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0xF0', '0xFA'], 'hex'),
			Buffer.from(['0x00', '0xFC'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(2097, 6)
		expect(result).toEqual([
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
		])
	})

	it('should retrieve breaker blinkType for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['blinkType']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 3149
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0x00', '0x00'], 'hex'),
			// Buffer.from(['0xFF', '0xFF'], 'hex'),
			// Buffer.from(['0x00', '0x00'], 'hex'),
			// Buffer.from(['0x00', '0x00'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				blinkType: 0,
				blinkTypeText: 'No Blink',
			},
		])
	})

	it('should retrieve breaker blinkType for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['blinkType']
		const quantity = 6

		powerlink.readHoldingRegisters = jest.fn()

		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x01'], 'hex'),
			Buffer.from(['0x00', '0x02'], 'hex'),
			Buffer.from(['0x00', '0x03'], 'hex'),
			Buffer.from(['0x00', '0x04'], 'hex'),
			Buffer.from(['0x00', '0x05'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(3149, 6)
		expect(result).toEqual([
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
		])
	})

	it('should retrieve breaker strikeCount for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['strikeCount']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 7097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0xFF', '0xFF'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 2)
		expect(result).toEqual([
			{
				strikeCount: 4294967295,
			},
		])
	})

	it('should retrieve breaker strikeCount for a single breaker with swapped values', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['strikeCount']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 7097
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 2 + breakerPositionOnBus

		powerlink.readHoldingRegisters = jest.fn()

		// const buf = Buffer.alloc(8)
		// buf.writeUInt32BE(4294967295, 0)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0xF0', '0xFA'], 'hex'),
			Buffer.from(['0x00', '0xFC'], 'hex'),

			Buffer.from(['0x00', '0x00'], 'hex'),
			Buffer.from(['0x00', '0x00'], 'hex'),
		])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 2)
		expect(result).toEqual([
			{
				strikeCount: 16576762,
			},
		])
	})

	it('should retrieve breaker strikeCount for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['strikeCount']
		const quantity = 3

		powerlink.readHoldingRegisters = jest.fn()

		const buf = Buffer.alloc(12)
		buf.writeUInt32BE(4294967295, 0)
		buf.writeUInt32BE(0, 4)
		buf.writeUInt32BE(4294967295, 8)
		powerlink.readHoldingRegisters.mockResolvedValueOnce([buf])
		// powerlink.readInputRegisters.mockResolvedValueOnce([
		// 	Buffer.from(['0xFF', '0xFF'], 'hex'),
		// 	Buffer.from(['0xFF', '0xFF'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		//   Buffer.from(['0x00', '0x00'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		//   Buffer.from(['0xFF', '0xFF'], 'hex'),
		// 	Buffer.from(['0xFF', '0xFF'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		// 	Buffer.from(['0x00', '0x00'], 'hex'),
		// ])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(7097, 6)
		expect(result).toEqual([
			{
				strikeCount: 4294967295,
			},
			{
				strikeCount: 0,
			},
			{
				strikeCount: 4294967295,
			},
		])
	})

	it('should retrieve breaker nameTag for a single breaker', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['nameTag']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 49
		const breakerPositionOnBus = 2
		const firstAddress = baseAddress - 1 + breakerPositionOnBus

		powerlink.readFiles = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readFiles.mockResolvedValueOnce(['This is a test'])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, undefined, info)

		expect(powerlink.readFiles).toHaveBeenCalledWith(5, firstAddress, 1)
		expect(result).toEqual([
			{
				nameTag: 'This is a test',
			},
		])
	})

	it('should retrieve breaker nameTag for multiple breakers', async () => {
		const busNumber = 2
		const breaker = 2
		const info = ['nameTag']
		const quantity = 3

		powerlink.readFiles = jest.fn()

		powerlink.readFiles.mockResolvedValueOnce(['This is a test', '', 'Testing'])

		const result = await powerlink.getBreakerInfoByBus(busNumber, breaker, quantity, info)

		expect(powerlink.readFiles).toHaveBeenCalledWith(5, 50, 3)
		expect(result).toEqual([
			{
				nameTag: 'This is a test',
			},
			{
				nameTag: '',
			},
			{
				nameTag: 'Testing',
			},
		])
	})
})

describe('getBreakerInfoByPanel', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should retrieve busNumber for a single breaker on the left side', async () => {
		const breaker = 1
		const panel = 1
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '1L',
			},
		])
	})

	it('should retrieve id for a single breaker on the left side', async () => {
		const breaker = 1
		const panel = 1
		const info = ['id']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				id: breaker,
			},
		])
	})

	it('should retrieve id for a single breaker on the Right side', async () => {
		const breaker = 2
		const panel = 1
		const info = ['id']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				id: breaker,
			},
		])
	})

	it('should retrieve id for a multiple breakers', async () => {
		const panel = 2
		const breaker = 2
		const info = ['id']

		let result
		try {
			result = await powerlink.getBreakerInfoByPanel(panel, breaker, 2, info)
		} catch (error) {
			console.error(error)
		}

		expect(result).toEqual([
			{
				id: 2,
			},
			{
				id: 3,
			},
		])

		const newResult = await powerlink.getBreakerInfoByPanel(0, 1, 2, info)

		expect(newResult).toEqual([
			{
				id: 1,
			},
			{
				id: 2,
			},
		])

		const third = await powerlink.getBreakerInfoByPanel(1, 2, 3, info)

		expect(third).toEqual([
			{
				id: 2,
			},
			{
				id: 3,
			},
			{
				id: 4,
			},
		])
	})

	it('should retrieve busNumber for a single breaker on the Right side', async () => {
		const breaker = 2
		const panel = 1
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '1R',
			},
		])
	})

	it('should retrieve busNumber for a single breaker on the left side with a higher breaker number', async () => {
		const breaker = 15
		const panel = 4
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '4L',
			},
		])
	})

	it('should retrieve busNumber for a single breaker on the Right side with a higher breaker number', async () => {
		const breaker = 16
		const panel = 4
		const info = ['busNumber']
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(result).toEqual([
			{
				busNumber: '4R',
			},
		])
	})

	it('should retrieve busNumber for a multiple breakers', async () => {
		const panel = 2
		const breaker = 2
		const info = ['busNumber']

		let result
		try {
			result = await powerlink.getBreakerInfoByPanel(panel, breaker, 2, info)
		} catch (error) {
			console.error(error)
		}

		expect(result).toEqual([
			{
				busNumber: '2R',
			},
			{
				busNumber: '2L',
			},
		])

		const newResult = await powerlink.getBreakerInfoByPanel(0, 1, 2, info)

		expect(newResult).toEqual([
			{
				busNumber: '0L',
			},
			{
				busNumber: '0R',
			},
		])

		const third = await powerlink.getBreakerInfoByPanel(1, 2, 3, info)

		expect(third).toEqual([
			{
				busNumber: '1R',
			},
			{
				busNumber: '1L',
			},
			{
				busNumber: '1R',
			},
		])
	})

	it('should retrieve directBreakerControl for a single breaker and check bus', async () => {
		const panel = 2
		const breaker = 2
		const info = ['directBreakerControl']

		powerlink.getBreakerInfoByBus = jest.fn()

		powerlink.getBreakerInfoByBus.mockResolvedValueOnce([false])

		await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(powerlink.getBreakerInfoByBus).toHaveBeenCalledWith(5, 1, 1, info)
	})

	it('should retrieve directBreakerControl for a single breaker', async () => {
		const panel = 2
		const breaker = 2
		const info = ['directBreakerControl']

		powerlink.readCoils = jest.fn()

		powerlink.readCoils.mockResolvedValueOnce([false])

		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, undefined, info)

		expect(powerlink.readCoils).toHaveBeenCalledWith({
			address: 3159,
			quantity: 1,
		})
		expect(result).toEqual([
			{
				directBreakerControl: false,
				directBreakerControlText: 'OFF',
			},
		])
	})

	it('should retrieve directBreakerControl for multiple breakers and check bus', async () => {
		const panel = 2
		const breaker = 2
		const info = ['directBreakerControl']
		const quantity = 3

		powerlink.getBreakerInfoByBus = jest.fn()

		powerlink.getBreakerInfoByBus.mockResolvedValueOnce([
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
			{
				directBreakerControl: 1,
				directBreakerControlText: 'ON',
			},
		])
		powerlink.getBreakerInfoByBus.mockResolvedValueOnce([
			{
				directBreakerControl: 0,
				directBreakerControlText: 'OFF',
			},
		])
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, quantity, info)

		// expect(powerlink.getBreakerInfoByBus).toHaveBeenCalled(2)
		expect(powerlink.getBreakerInfoByBus).toHaveBeenCalledWith(5, 1, 2, info)
		expect(powerlink.getBreakerInfoByBus).toHaveBeenCalledWith(4, 1, 1, info)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
		expect(result).toEqual([
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
		])
	})

	it('should retrieve directBreakerControl for multiple breakers', async () => {
		const panel = 2
		const breaker = 2
		const info = ['directBreakerControl']
		const quantity = 3

		powerlink.readCoils = jest.fn()

		powerlink.readCoils.mockResolvedValueOnce([1, 1])
		powerlink.readCoils.mockResolvedValueOnce([0])
		const result = await powerlink.getBreakerInfoByPanel(panel, breaker, quantity, info)

		// expect(powerlink.readCoils).toHaveBeenCalled(2)
		expect(powerlink.readCoils).toHaveBeenCalledWith({
			address: 3159,
			quantity: 2,
		})
		expect(powerlink.readCoils).toHaveBeenCalledWith({
			address: 3127,
			quantity: 1,
		})
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
		expect(result).toEqual([
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
		])
	})
})

describe('shuffle', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should throw an error if they arent arrays', () => {
		const array1 = [1, 2, 3]
		const array2 = ['a', 'b', 'c']
		const length = 6
		expect.assertions(3)

		try {
			powerlink.shuffle('test', array2, length)
		} catch (e) {
			expect(e).toMatch('Invalid Input: Array input is required')
		}

		try {
			powerlink.shuffle(array1, 'test', length)
		} catch (e) {
			expect(e).toMatch('Invalid Input: Array input is required')
		}

		try {
			powerlink.shuffle('test', 'test', length)
		} catch (e) {
			expect(e).toMatch('Invalid Input: Array input is required')
		}
	})

	it('should shuffle two arrays into one with alternating elements', () => {
		const array1 = [1, 2, 3]
		const array2 = ['a', 'b', 'c']
		const length = 6

		const result = powerlink.shuffle(array1, array2, length)

		expect(result).toEqual([1, 'a', 2, 'b', 3, 'c'])
	})

	it('should handle arrays of different lengths and fill missing elements with undefined', () => {
		const array1 = [1, 2, 3]
		const array2 = ['a', 'b']
		const length = 5

		const result = powerlink.shuffle(array1, array2, length)

		expect(result).toEqual([1, 'a', 2, 'b', 3])
	})

	// This isn't a requirement but might be nice
	it('should handle arrays with lengths greater than the specified length and truncate the result', () => {
		const array1 = [1, 2, 3, 4, 5]
		const array2 = ['a', 'b', 'c', 'd', 'e']
		const length = 8

		const result = powerlink.shuffle(array1, array2, length)

		expect(result).toEqual([1, 'a', 2, 'b', 3, 'c', 4, 'd'])
	})
})

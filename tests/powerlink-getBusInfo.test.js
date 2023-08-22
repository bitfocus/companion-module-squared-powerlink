const Powerlink = require('../powerlink')

jest.mock('modbus-stream')

describe('getBusInfo', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should throw an error for an invalid bus number', async () => {
		expect.assertions(2)
		try {
			await powerlink.getBusInfo(-1)
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}

		try {
			await powerlink.getBusInfo(16)
		} catch (e) {
			expect(e).toMatch('Invalid Bus Number')
		}
	})

	it('should retrieve bus id for a single bus', async () => {
		const busNumber = 2
		const quantity = 1
		const info = ['id']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				id: busNumber,
			},
		])
	})

	it('should retrieve busNumber for a single bus', async () => {
		const busNumber = 2
		const quantity = 1
		const info = ['busNumber']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '1L',
			},
		])
	})

	it('should retrieve busNumber for a single breaker with a higher bus number', async () => {
		const busNumber = 10
		const quantity = 1
		const info = ['busNumber']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '5L',
			},
		])
	})

	it('should retrieve busNumber for a single bus with a higher bus number on the right side', async () => {
		const busNumber = 11
		const quantity = 1
		const info = ['busNumber']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '5R',
			},
		])
	})

	it('should retrieve busNumber for a mulitple buses', async () => {
		const busNumber = 2
		const quantity = 2
		const info = ['busNumber']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '1L',
			},
			{
				busNumber: '1R',
			},
		])

		const newResult = await powerlink.getBusInfo(0, 2, info)

		expect(newResult).toEqual([
			{
				busNumber: '0L',
			},
			{
				busNumber: '0R',
			},
		])

		const third = await powerlink.getBusInfo(3, 3, info)

		expect(third).toEqual([
			{
				busNumber: '1R',
			},
			{
				busNumber: '2L',
			},
			{
				busNumber: '2R',
			},
		])
	})

	it('should retrieve bus id for a mulitple buses', async () => {
		const busNumber = 2
		const quantity = 2
		const info = ['id']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				id: 2,
			},
			{
				id: 3,
			},
		])

		const newResult = await powerlink.getBusInfo(0, 2, info)

		expect(newResult).toEqual([
			{
				id: 0,
			},
			{
				id: 1,
			},
		])

		const third = await powerlink.getBusInfo(3, 3, info)

		expect(third).toEqual([
			{
				id: 3,
			},
			{
				id: 4,
			},
			{
				id: 5,
			},
		])
	})

	it('should limit busNumber when over the amount of available buses', async () => {
		const busNumber = 14
		const quantity = 3
		const info = ['busNumber']
		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(result).toEqual([
			{
				busNumber: '7L',
			},
			{
				busNumber: '7R',
			},
		])

		const newResult = await powerlink.getBusInfo(15, 3, info)

		expect(newResult).toEqual([
			{
				busNumber: '7R',
			},
		])
	})

	it('should retrieve present for a single bus', async () => {
		const busNumber = 2
		const quantity = 1
		const info = ['present']

		const baseAddress = 2500
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([false])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				present: false,
				presentText: 'Absent',
			},
		])
	})
	it('should retrieve present for mulitple breakers', async () => {
		const busNumber = 2
		const info = ['present']
		const quantity = 3

		const baseAddress = 2500
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
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

	it('should retrieve hasNotRespondingBreaker for a single bus', async () => {
		const busNumber = 2
		const quantity = 1
		const info = ['hasNotRespondingBreaker']

		const baseAddress = 9964
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([false])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				hasNotRespondingBreaker: false,
				hasNotRespondingBreakerText: 'Normal',
			},
		])
	})
	it('should retrieve hasNotRespondingBreaker for mulitple breakers', async () => {
		const busNumber = 2
		const info = ['hasNotRespondingBreaker']
		const quantity = 3

		const baseAddress = 9964
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readDiscreteInputs = jest.fn()

		powerlink.readDiscreteInputs.mockResolvedValueOnce([1, 0, 1])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(firstAddress, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
		expect(result).toEqual([
			{
				hasNotRespondingBreaker: 1,
				hasNotRespondingBreakerText: 'Not Responding',
			},
			{
				hasNotRespondingBreaker: 0,
				hasNotRespondingBreakerText: 'Normal',
			},
			{
				hasNotRespondingBreaker: 1,
				hasNotRespondingBreakerText: 'Not Responding',
			},
		])
	})

	it('should retrieve numberingSequence for a single bus', async () => {
		const busNumber = 2
		const quantity = 1
		const info = ['numberingSequence']

		const baseAddress = 3001
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readHoldingRegisters = jest.fn()

		powerlink.readHoldingRegisters.mockResolvedValueOnce([Buffer.from(['0x00', '0x01'], 'hex')])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 1)
		expect(result).toEqual([
			{
				numberingSequence: {
					sequence: 0,
					sequenceText: "Increment by 2's",
					firstBreakerNumber: 1, //1-48, default value = 1 on xL bus addresss and 2 on xR bus addresses
				},
			},
		])
	})
	it('should retrieve numberingSequence for mulitple buses', async () => {
		const busNumber = 3
		const info = ['numberingSequence']
		const quantity = 4

		const baseAddress = 3001
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readHoldingRegisters = jest.fn()

		powerlink.readHoldingRegisters.mockResolvedValueOnce([
			Buffer.from(['0x00', '0x02'], 'hex'),
			Buffer.from(['0x01', '0x18'], 'hex'),
			Buffer.from(['0x02', '0x30'], 'hex'),
			Buffer.from(['0x03', '0x01'], 'hex'),
		])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readHoldingRegisters).toHaveBeenCalledWith(firstAddress, 4)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(3673, 3)
		// expect(powerlink.readDiscreteInputs).toHaveBeenCalledWith(5273, 3)
		expect(result).toEqual([
			{
				numberingSequence: {
					sequence: 0,
					sequenceText: "Increment by 2's",
					firstBreakerNumber: 2, //1-48, default value = 1 on xL bus addresss and 2 on xR bus addresses
				},
			},
			{
				numberingSequence: {
					sequence: 1,
					sequenceText: "Increment by 1's",
					firstBreakerNumber: 24, //1-48, default value = 1 on xL bus addresss and 2 on xR bus addresses
				},
			},
			{
				numberingSequence: {
					sequence: 2,
					sequenceText: "Decrement by 2's",
					firstBreakerNumber: 48, //1-48, default value = 1 on xL bus addresss and 2 on xR bus addresses
				},
			},
			{
				numberingSequence: {
					sequence: 3,
					sequenceText: "Decrement by 1's",
					firstBreakerNumber: 1, //1-48, default value = 1 on xL bus addresss and 2 on xR bus addresses
				},
			},
		])
	})

	it('should retrieve bus nameTag for a single bus', async () => {
		const busNumber = 2
		const info = ['nameTag']

		//(Base Address – 1) + Breaker Position on Bus = Address
		//For example, use this address to read the actual state of the 3rd breaker on bus 0L:
		//(13000 – 1) + 3 = 13002

		const baseAddress = 1 + 1
		const firstAddress = baseAddress - 1 + busNumber

		powerlink.readFiles = jest.fn()

		const buf = Buffer.alloc(8)
		buf.writeUInt32BE(4294967295, 0)
		powerlink.readFiles.mockResolvedValueOnce(['This is a test'])

		const result = await powerlink.getBusInfo(busNumber, undefined, info)

		expect(powerlink.readFiles).toHaveBeenCalledWith(6, firstAddress, 1)
		expect(result).toEqual([
			{
				nameTag: 'This is a test',
			},
		])
	})

	it('should retrieve bus nameTag for mulitple buses', async () => {
		const busNumber = 2
		const info = ['nameTag']
		const quantity = 3

		powerlink.readFiles = jest.fn()

		powerlink.readFiles.mockResolvedValueOnce(['This is a test', '', 'Testing'])

		const result = await powerlink.getBusInfo(busNumber, quantity, info)

		expect(powerlink.readFiles).toHaveBeenCalledWith(6, 3, 3)
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

describe('getPanelInfo', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
		powerlink.init()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should throw an error for an invalid panel number', async () => {
		expect.assertions(2)
		try {
			await powerlink.getPanelInfo(-1)
		} catch (e) {
			expect(e).toMatch('Invalid Panel Number')
		}

		try {
			await powerlink.getPanelInfo(8)
		} catch (e) {
			expect(e).toMatch('Invalid Panel Number')
		}
	})

	it('should retrieve panel info for a single panel', async () => {
		const panel = 2
		const quantity = 1
		const info = []

		powerlink.getBusInfo = jest.fn()

		powerlink.getBusInfo.mockResolvedValueOnce([
			{
				id: 4,
				nameTag: 'test',
			},
			{
				id: 5,
				nameTag: 'test2',
			},
		])

		const result = await powerlink.getPanelInfo(panel, quantity, info)

		expect(powerlink.getBusInfo).toHaveBeenCalledWith(4, 2, [])

		expect(result).toEqual([
			{
				id: panel,
				nameTag: 'test',
				busL: {
					nameTag: 'test',
					id: 4,
				},
				busR: {
					id: 5,
					nameTag: 'test2',
				},
			},
		])
	})

	it('should retrieve panel info for multiple panels', async () => {
		const panel = 2
		const quantity = 2
		const info = []

		powerlink.getBusInfo = jest.fn()

		powerlink.getBusInfo.mockResolvedValueOnce([
			{
				id: 4,
				nameTag: 'test',
			},
			{
				id: 5,
				nameTag: 'test2',
			},
			{
				id: 6,
				nameTag: 'test3',
			},
			{
				id: 7,
				nameTag: 'test4',
			},
		])

		const result = await powerlink.getPanelInfo(panel, quantity, info)

		expect(powerlink.getBusInfo).toHaveBeenCalledWith(4, 4, [])

		expect(result).toEqual([
			{
				id: panel,
				nameTag: 'test',
				busL: {
					nameTag: 'test',
					id: 4,
				},
				busR: {
					id: 5,
					nameTag: 'test2',
				},
			},
			{
				id: panel + 1,
				nameTag: 'test3',
				busL: {
					nameTag: 'test3',
					id: 6,
				},
				busR: {
					id: 7,
					nameTag: 'test4',
				},
			},
		])
	})

	it('should limit retrieving panel info for multiple panels if panel quantity is over panel count', async () => {
		const panel = 7
		const quantity = 2
		const info = []

		powerlink.getBusInfo = jest.fn()

		powerlink.getBusInfo.mockResolvedValueOnce([
			{
				id: 14,
				nameTag: 'test',
			},
			{
				id: 15,
				nameTag: 'test2',
			},
		])

		const result = await powerlink.getPanelInfo(panel, quantity, info)

		expect(powerlink.getBusInfo).toHaveBeenCalledWith(14, 2, [])

		expect(result).toEqual([
			{
				id: panel,
				nameTag: 'test',
				busL: {
					nameTag: 'test',
					id: 14,
				},
				busR: {
					id: 15,
					nameTag: 'test2',
				},
			},
		])
	})
})

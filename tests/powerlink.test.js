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
				})
			),
		},
	}
})

describe('Powerlink', () => {
	let powerlink

	beforeEach(() => {
		powerlink = new Powerlink('localhost')
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('init', () => {
		it('should establish a connection', async () => {
			//   connect.mockResolvedValue(); // mock the connect function

			await powerlink.init()

			expect(modbus.tcp.connect).toHaveBeenCalled() //With(powerlink.port, powerlink.host, {}, () => {return true})
			expect(powerlink.connection).toBeDefined()
		})

		it('throws an error on timeout', async () => {
			const mockError = new Error('GatewayPathUnavailable')
			const mockConnect = jest.fn(() => {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						reject(mockError)
					}, 500)
				})
			})

			modbus.tcp.connect = mockConnect // Mock the connect function

			try {
				await powerlink.init()
			} catch (error) {
				expect(error.message).toEqual(`Unable to connect to ${powerlink.host}:${powerlink.port}: ${mockError.message}`)
			}
		})
	})

	describe('close', () => {
		it('should close the connection', async () => {
			// await powerlink.init()
			const test = { close: jest.fn() }
			powerlink.connection = test
			powerlink.close()

			expect(test.close).toHaveBeenCalled()
			expect(powerlink.connection).toBeUndefined()
		})

		it('should not try to close the connection if it is undefined', () => {
			expect(powerlink.connection).toBeUndefined()
			powerlink.close()
			expect(powerlink.connection).toBeUndefined()
		})
	})

	describe('byteToBits', () => {
		it('should convert 0 to [0, 0, 0, 0, 0, 0, 0, 0]', () => {
			const result = powerlink.byteToBits(0)
			expect(result).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
		})

		it('should convert 255 to [1, 1, 1, 1, 1, 1, 1, 1]', () => {
			const result = powerlink.byteToBits(255)
			expect(result).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
		})

		it('should convert 170 to [1, 0, 1, 0, 1, 0, 1, 0]', () => {
			const result = powerlink.byteToBits(170)
			expect(result).toEqual([1, 0, 1, 0, 1, 0, 1, 0])
		})

		it('should convert 85 to [0, 1, 0, 1, 0, 1, 0, 1]', () => {
			const result = powerlink.byteToBits(85)
			expect(result).toEqual([0, 1, 0, 1, 0, 1, 0, 1])
		})
	})

	describe('bitExtracted', () => {
		it('should extract bits 0 to 3 from number 10 (binary: 1010)', () => {
			const result = powerlink.bitExtracted(10, 3, 0)
			expect(result).toBe(2)
		})

		it('should extract bits 1 to 2 from number 7 (binary: 0111)', () => {
			const result = powerlink.bitExtracted(7, 2, 1)
			expect(result).toBe(3)
		})

		it('should extract bits 3 to 7 from number 240 (binary: 11110000)', () => {
			const result = powerlink.bitExtracted(240, 5, 3)
			expect(result).toBe(30)
		})

		it('should extract bits 4 to 6 from number 27 (binary: 00011011)', () => {
			const result = powerlink.bitExtracted(27, 3, 4)
			expect(result).toBe(1)
		})
	})

	describe('readXFiles', () => {

		it('should read files in raw format', async () => {
			const requests = {
				file: 5,
				address: 1,
				length: 16,
			}
			const raw = true
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				const result = {
					response: {
						data: [
							[
								Buffer.from('Th'),
								Buffer.from('is'),
								Buffer.from(' i'),
								Buffer.from('s '),
								Buffer.from('a '),
								Buffer.from('te'),
								Buffer.from('st'),
							],
						],
					},
				}
				callback(null, result)
			})
			const result = await powerlink.readXFiles(requests, raw)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = [Buffer.from('This is a test')]

			expect(result).toEqual(expectedResults)
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})

		it('should read files in ASCII format', async () => {
			const requests = {
				file: 5,
				address: 1,
				length: 16,
			}
			const raw = false
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				const result = {
					response: {
						data: [
							[
								Buffer.from('Th'),
								Buffer.from('is'),
								Buffer.from(' i'),
								Buffer.from('s '),
								Buffer.from('a '),
								Buffer.from('te'),
								Buffer.from('st'),
							],
						],
					},
				}
				callback(null, result)
			})
			const result = await powerlink.readXFiles(requests, raw)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = ['This is a test']

			expect(result).toEqual(expectedResults)
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})

		it('should reject with an error if Modbus operation fails', async () => {
			const requests = [0x07, 0x08, 0x09]
			const raw = true
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				const error = new Error('Modbus operation failed')
				callback(error)
			})

			await expect(powerlink.readXFiles(requests, raw)).rejects.toThrow('Modbus operation failed')
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})

		it('should reject with an error if Modbus response contains an exception', async () => {
			const requests = [0x0a, 0x0b, 0x0c]
			const raw = true
			const responseWithException = {
				response: {
					exception: 'Modbus response contains an exception',
				},
			}
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				callback(null, responseWithException)
			})

			await expect(powerlink.readXFiles(requests, raw)).rejects.toThrow('Modbus response contains an exception')
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})
	})

	describe('writeFiles', () => {

		it('should write a file in raw format', async () => {
			const file = 5
			const address = 1
			const values = [
				Buffer.from(
					[
						'0x00',
						'0x00',
						'0x00',
						'0x80',
						'0x00',
						'0x00',
						'0x00',
						'0x01',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
						'0x00',
					],
					'hex'
				),
			]
			const raw = true
			const length = 64
			await powerlink.init()
			powerlink.connection.writeFileRecord.mockImplementationOnce((options, callback) => {
				const result = {
					response: {
						data: [],
					},
				}
				callback(null, result)
			})
			const result = await powerlink.writeFiles(file, address, values, length, raw)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = [
				Buffer.from('Th'),
				Buffer.from('is'),
				Buffer.from(' i'),
				Buffer.from('s '),
				Buffer.from('a '),
				Buffer.from('te'),
				Buffer.from('st'),
				Buffer.from('  '),
			]

			expect(powerlink.connection.writeFileRecord).toHaveBeenCalledWith(
				{
					requests: [
						{
							file: 5,
							address: 1,
							values: [
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x80']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x01']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00']),
								Buffer.from(['0x00', '0x00'], 'hex'),
							],
						},
					],
				},
				expect.any(Function)
			)
		})

		it('should write a file in ASCII format', async () => {
			const file = 5
			const address = 1
			const values = ['This is a test']
			const raw = false
			await powerlink.init()
			powerlink.connection.writeFileRecord.mockImplementationOnce((options, callback) => {
				const result = {
					response: {
						data: [],
					},
				}
				callback(null, result)
			})
			const result = await powerlink.writeFiles(file, address, values)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = [
				Buffer.from('Th'),
				Buffer.from('is'),
				Buffer.from(' i'),
				Buffer.from('s '),
				Buffer.from('a '),
				Buffer.from('te'),
				Buffer.from('st'),
				Buffer.from('  '),
			]
			// console.log('expectedResults', expectedResults)

			// expect(result).toEqual(expectedResults);
			expect(powerlink.connection.writeFileRecord).toHaveBeenCalledWith(
				{
					requests: [
						{
							file: 5,
							address: 1,
							values: expectedResults,
						},
					],
				},
				expect.any(Function)
			)
		})

		it('should write multiple files in ASCII format', async () => {
			const file = 5
			const address = 1
			const values = ['This is a test', 'This is another Test', 'this']
			const raw = false
			await powerlink.init()
			powerlink.connection.writeFileRecord.mockImplementationOnce((options, callback) => {
				const result = {
					response: {
						data: [],
					},
				}
				callback(null, result)
			})
			const result = await powerlink.writeFiles(file, address, values)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = [
				Buffer.from('Th'),
				Buffer.from('is'),
				Buffer.from(' i'),
				Buffer.from('s '),
				Buffer.from('a '),
				Buffer.from('te'),
				Buffer.from('st'),
				Buffer.from('  '),
			]
			// console.log('expectedResults', expectedResults)

			// expect(result).toEqual(expectedResults);
			expect(powerlink.connection.writeFileRecord).toHaveBeenCalledWith(
				{
					requests: [
						{
							file: 5,
							address: 1,
							values: expectedResults,
						},
						{
							file: 5,
							address: 2,
							values: [
								Buffer.from('Th'),
								Buffer.from('is'),
								Buffer.from(' i'),
								Buffer.from('s '),
								Buffer.from('an'),
								Buffer.from('ot'),
								Buffer.from('he'),
								Buffer.from('r '),
							],
						},
						{
							file: 5,
							address: 3,
							values: [
								Buffer.from('th'),
								Buffer.from('is'),
								Buffer.from('  '),
								Buffer.from('  '),
								Buffer.from('  '),
								Buffer.from('  '),
								Buffer.from('  '),
								Buffer.from('  '),
							],
						},
					],
				},
				expect.any(Function)
			)
		})

		it('should reject with an error if Modbus operation fails', async () => {
			const requests = [0x07, 0x08, 0x09]
			const raw = true
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				const error = new Error('Modbus operation failed')
				callback(error)
			})

			await expect(powerlink.readXFiles(requests, raw)).rejects.toThrow('Modbus operation failed')
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})

		it('should reject with an error if Modbus response contains an exception', async () => {
			const requests = [0x0a, 0x0b, 0x0c]
			const raw = true
			const responseWithException = {
				response: {
					exception: 'Modbus response contains an exception',
				},
			}
			await powerlink.init()
			powerlink.connection.readFileRecord.mockImplementationOnce((options, callback) => {
				callback(null, responseWithException)
			})

			await expect(powerlink.readXFiles(requests, raw)).rejects.toThrow('Modbus response contains an exception')
			expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function))
		})
	})

	describe('flipLowerAddress', () => {
		it('should read files in raw format', async () => {
			const buffer = Buffer.from(['0x46', '0x9C', '0x00', '0x4C'], 'hex')
			await powerlink.init()
			const result = powerlink.flipLowerAddress(buffer)

			// Replace the expectedResults with the expected response based on the mocked data above
			const expectedResults = Buffer.from(['0x00', '0x4C', '0x46', '0x9C'], 'hex')

			expect(result).toEqual(expectedResults)
			// expect(powerlink.connection.readFileRecord).toHaveBeenCalledWith({ requests }, expect.any(Function));
		})
	})
})
